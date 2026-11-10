/**
 * Turns raw signals (CPU samples + startup log) into one ranked report.
 */

import * as vscode from "vscode";
import { attribute, buildAttribution } from "./attribute";
import { profileExtensionHost, startLagMonitor, type RawProfile } from "./cpu";
import { readStartupInfo } from "./logs";
import type { ExtInfo, LagStats, Report, Row } from "./types";

/** Our own extension id — excluded so the profiler never blames itself. */
const SELF_ID = "devreadytools.blame-the-extension";

function listExtensions(): ExtInfo[] {
  return vscode.extensions.all.map((ext) => {
    const pkg = ext.packageJSON as { publisher?: string; name?: string; displayName?: string; description?: string; version?: string };
    const [publisher, name] = ext.id.split(".");
    return {
      id: ext.id,
      publisher: pkg.publisher ?? publisher ?? "unknown",
      name: pkg.name ?? name ?? ext.id,
      version: String(pkg.version ?? ""),
      displayName: pkg.displayName ?? pkg.name ?? ext.id,
      description: pkg.description ?? "",
      isBuiltin: Boolean((ext.packageJSON as { isBuiltin?: boolean }).isBuiltin) || ext.id.startsWith("vscode."),
      isActive: ext.isActive,
      extensionPath: ext.extensionUri.fsPath
    };
  });
}

export async function runProfile(includeBuiltins: boolean): Promise<Report> {
  const warnings: string[] = [];
  const seconds = vscode.workspace
    .getConfiguration("blameTheExtension")
    .get<number>("sampleSeconds", 10);
  const durationMs = Math.max(3, Math.min(60, seconds)) * 1000;

  const extensions = listExtensions();
  const attribution = buildAttribution(extensions);

  const startup = readStartupInfo();
  if (!startup.logFile) {
    warnings.push(
      "No extension-host log found, so startup costs are unavailable. CPU results are unaffected."
    );
  }

  const lagMonitor = startLagMonitor(durationMs);

  let raw: RawProfile;
  try {
    raw = await profileExtensionHost(durationMs);
  } catch (error) {
    lagMonitor.stop();
    throw new Error(
      `Could not attach the CPU profiler (${
        error instanceof Error ? error.message : String(error)
      }). This usually means another debugger is attached to the extension host.`
    );
  }

  const lag: LagStats | null = lagMonitor.stop();

  // Collect CPU samples per extension.
  const cpuByExtension = new Map<string, { samples: number; functions: Map<string, number> }>();
  let coreSamples = 0;

  for (const [url, entry] of raw.byUrl) {
    const id = attribute(url, attribution);
    if (id === SELF_ID) {
      coreSamples += entry.samples;
      continue;
    }
    if (id === null) {
      coreSamples += entry.samples;
      continue;
    }
    let bucket = cpuByExtension.get(id);
    if (!bucket) {
      bucket = { samples: 0, functions: new Map() };
      cpuByExtension.set(id, bucket);
    }
    bucket.samples += entry.samples;
    for (const [fn, count] of entry.functions) {
      bucket.functions.set(fn, (bucket.functions.get(fn) ?? 0) + count);
    }
  }

  const totalSamples = Math.max(raw.totalSamples, 1);

  const visible = extensions.filter((ext) => includeBuiltins || !ext.isBuiltin);
  const hiddenBuiltins = extensions.filter((ext) => !includeBuiltins && ext.isBuiltin).length;

  const rows: Row[] = visible.map((ext) => {
    const bucket = cpuByExtension.get(ext.id);
    const samples = bucket?.samples ?? 0;
    const activation = startup.activations.get(ext.id);
    const activationMs = activation?.reportedMs ?? activation?.deltaMs ?? null;

    let topFunction: string | null = null;
    if (bucket) {
      let best = 0;
      for (const [fn, count] of bucket.functions) {
        if (count > best) {
          best = count;
          topFunction = fn;
        }
      }
    }

    return {
      ext,
      cpuShare: samples / totalSamples,
      cpuMs: samples,
      activationMs,
      eager: activation?.startup ?? false,
      activationEvent: activation?.activationEvent ?? null,
      score: 0,
      verdict: "idle",
      topFunction
    };
  });

  rescore(rows);

  if (hiddenBuiltins > 0) {
    warnings.push(
      `${hiddenBuiltins} built-in extension(s) hidden. Enable "blameTheExtension.showBuiltInExtensions" to include them.`
    );
  }
  if (raw.totalSamples === 0) {
    warnings.push("The CPU profiler collected no samples. Try a longer sample window.");
  }
  if ((lag?.p95 ?? 0) > 100) {
    warnings.push(
      `Event-loop lag p95 is ${lag?.p95}ms — the extension host is blocking the main thread.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    vscodeVersion: vscode.version,
    extensionHostPid: raw.pid,
    durationMs,
    totalSamples: raw.totalSamples,
    coreShare: coreSamples / totalSamples,
    heapUsedMb: raw.heapUsedMb,
    lag,
    startupTotalMs: startup.startupTotalMs,
    logFile: startup.logFile,
    rows,
    warnings
  };
}

/**
 * Normalise scores against the worst offender so they land in 0..100.
 * Weights favour live CPU cost (65%) over startup (35%) because CPU is what
 * makes the editor feel slow all day, while startup is a one-off.
 */
export function rescore(rows: Row[]): void {
  const maxCpu = Math.max(0, ...rows.map((row) => row.cpuShare));
  const maxActivation = Math.max(0, ...rows.map((row) => row.activationMs ?? 0));
  const hasActivation = maxActivation > 0;

  for (const row of rows) {
    const cpuNorm = maxCpu > 0 ? row.cpuShare / maxCpu : 0;
    const actNorm = hasActivation ? (row.activationMs ?? 0) / maxActivation : 0;
    const score = hasActivation ? 65 * cpuNorm + 35 * actNorm : 100 * cpuNorm;
    row.score = Math.round(score);
    row.verdict =
      row.score >= 70 ? "blame" : row.score >= 40 ? "watch" : row.score > 0 ? "fine" : "idle";
  }

  rows.sort((a, b) => b.score - a.score || b.cpuShare - a.cpuShare);
}

/** Re-read startup data and fold it into an existing CPU report. */
export function refreshStartup(report: Report): Report {
  const startup = readStartupInfo();
  const rows = report.rows.map((row) => {
    const activation = startup.activations.get(row.ext.id);
    return {
      ...row,
      activationMs: activation?.reportedMs ?? activation?.deltaMs ?? null,
      eager: activation?.startup ?? false,
      activationEvent: activation?.activationEvent ?? null
    };
  });
  rescore(rows);
  return {
    ...report,
    rows,
    startupTotalMs: startup.startupTotalMs,
    logFile: startup.logFile
  };
}
