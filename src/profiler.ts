/**
 * Turns raw signals into one ranked report.
 *
 * Inputs:
 *   - CPU samples from the inspector (live) and from the action benchmark
 *   - startup data from VS Code's extension-host log
 *   - stutters / background CPU collected continuously by the watchers
 *   - the previous profile, for the regression banner
 */

import * as vscode from "vscode";
import { attribute, buildAttribution } from "./attribute";
import { auditExtensions, type AuditInput } from "./audit";
import { compareBaseline, type BaselineSnapshot } from "./baseline";
import {
  profileExtensionHost,
  startLagMonitor,
  startProfiler,
  type RawProfile,
  type UrlSample
} from "./cpu";
import { measureActions } from "./latency";
import { readStartupInfo, type StartupInfo } from "./logs";
import type {
  BackgroundSession,
  ExtInfo,
  LagStats,
  LatencyReport,
  Report,
  Row,
  SessionSummary,
  StutterEvent,
  TimelineSegment,
  TopFunction
} from "./types";

/** Our own extension id — excluded so the profiler never blames itself. */
const SELF_ID = "sudarsans.blame-the-extension";

export interface ProfileContext {
  includeBuiltins: boolean;
  baseline: BaselineSnapshot | null;
  stutters: StutterEvent[];
  background: BackgroundSession[];
  session: SessionSummary;
  onPhase?: (message: string) => void;
}

interface Bucket {
  samples: number;
  functions: Map<string, number>;
}

/** Last path segment of a script URL, used to label hot functions. */
function fileBase(url: string): string {
  const clean = url.split("?")[0];
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || clean;
}

function listExtensions(): ExtInfo[] {
  return vscode.extensions.all.map((ext) => {
    const pkg = ext.packageJSON as {
      publisher?: string;
      name?: string;
      displayName?: string;
      description?: string;
      version?: string;
      isBuiltin?: boolean;
    };
    const [publisher, name] = ext.id.split(".");
    return {
      id: ext.id,
      publisher: pkg.publisher ?? publisher ?? "unknown",
      name: pkg.name ?? name ?? ext.id,
      version: String(pkg.version ?? ""),
      displayName: pkg.displayName ?? pkg.name ?? ext.id,
      description: pkg.description ?? "",
      isBuiltin: Boolean(pkg.isBuiltin) || ext.id.startsWith("vscode."),
      isActive: ext.isActive,
      extensionPath: ext.extensionUri.fsPath
    };
  });
}

function auditInputs(): AuditInput[] {
  return vscode.extensions.all.map((ext) => {
    const pkg = ext.packageJSON as { isBuiltin?: boolean; contributes?: AuditInput["contributes"] };
    return {
      id: ext.id,
      isBuiltin: Boolean(pkg.isBuiltin) || ext.id.startsWith("vscode."),
      contributes: (pkg.contributes ?? {}) as AuditInput["contributes"]
    };
  });
}

function buildTimeline(startup: StartupInfo, limitMs = 30000): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let cursor = 0;

  if (startup.bootMs !== null && startup.bootMs > 0) {
    segments.push({ id: "boot", label: "boot", startMs: 0, durationMs: startup.bootMs, eager: true });
    cursor = startup.bootMs;
  }

  for (const entry of startup.timeline) {
    const durationMs = entry.reportedMs ?? entry.deltaMs ?? 0;
    if (durationMs <= 0) {
      continue;
    }
    if (cursor > limitMs) {
      break;
    }
    segments.push({
      id: entry.id,
      label: entry.id.replace(/^vscode\./, ""),
      startMs: cursor,
      durationMs,
      eager: entry.startup
    });
    cursor += durationMs;
  }

  return segments;
}

function groupSamples(
  byUrl: Map<string, UrlSample>,
  lookup: ReturnType<typeof buildAttribution>
): { byExtension: Map<string, Bucket>; coreSamples: number } {
  const byExtension = new Map<string, Bucket>();
  let coreSamples = 0;

  for (const [url, entry] of byUrl) {
    const id = attribute(url, lookup);
    if (id === null || id === SELF_ID) {
      coreSamples += entry.samples;
      continue;
    }
    let bucket = byExtension.get(id);
    if (!bucket) {
      bucket = { samples: 0, functions: new Map() };
      byExtension.set(id, bucket);
    }
    bucket.samples += entry.samples;
    const file = fileBase(url);
    for (const [fn, count] of entry.functions) {
      const key = `${file}::${fn}`;
      bucket.functions.set(key, (bucket.functions.get(key) ?? 0) + count);
    }
  }

  return { byExtension, coreSamples };
}

function topFunctionsOf(bucket: Bucket | undefined): TopFunction[] {
  if (!bucket || bucket.samples <= 0) {
    return [];
  }
  return [...bucket.functions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const separator = key.indexOf("::");
      return {
        name: separator >= 0 ? key.slice(separator + 2) : key,
        file: separator >= 0 ? key.slice(0, separator) : "",
        samples: count,
        share: count / bucket.samples
      };
    });
}

export async function runProfile(ctx: ProfileContext): Promise<Report> {
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

  ctx.onPhase?.("Sampling the extension host…");
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
  const totalSamples = Math.max(raw.totalSamples, 1);
  const hostBusyShare = Math.min(1, raw.totalSamples / durationMs);
  const { byExtension, coreSamples } = groupSamples(raw.byUrl, attribution);
  const coreShare = coreSamples / totalSamples;

  const visible = extensions.filter(
    (ext) => ext.id !== SELF_ID && (ctx.includeBuiltins || !ext.isBuiltin)
  );
  const hiddenBuiltins = ctx.includeBuiltins
    ? 0
    : extensions.filter((ext) => ext.id !== SELF_ID && ext.isBuiltin).length;

  const rows: Row[] = visible.map((ext) => {
    const bucket = byExtension.get(ext.id);
    const samples = bucket?.samples ?? 0;
    const activation = startup.activations.get(ext.id);

    return {
      ext,
      cpuShare: samples / totalSamples,
      cpuPct: (samples / durationMs) * 100,
      cpuMs: samples,
      activationMs: activation?.reportedMs ?? activation?.deltaMs ?? null,
      eager: activation?.startup ?? false,
      activationEvent: activation?.activationEvent ?? null,
      score: 0,
      verdict: "idle",
      topFunctions: topFunctionsOf(bucket)
    };
  });

  rescore(rows);

  // ---- Phase 2: action latency, with its own short profile for attribution ----
  ctx.onPhase?.("Measuring editor actions…");
  let latency: LatencyReport | null = null;
  try {
    const running = await startProfiler();
    const measured = await measureActions();
    const digest = await running.stop();
    const actionGroups = groupSamples(digest.byUrl, attribution);

    let topId: string | null = null;
    let topCount = 0;
    for (const [id, bucket] of actionGroups.byExtension) {
      if (bucket.samples > topCount) {
        topCount = bucket.samples;
        topId = id;
      }
    }

    latency = {
      ...measured,
      attributed: topCount > 0,
      topExtension:
        topId === null ? null : { id: topId, share: topCount / Math.max(1, digest.totalSamples) }
    };
  } catch {
    warnings.push("Action latency could not be measured because the CPU profiler was unavailable.");
  }

  // ---- Static analysis ----
  const audit = auditExtensions(auditInputs());

  if (hiddenBuiltins > 0) {
    warnings.push(
      `${hiddenBuiltins} built-in extension(s) hidden. Enable "blameTheExtension.showBuiltInExtensions" to include them.`
    );
  }
  if (raw.totalSamples === 0) {
    warnings.push("The CPU profiler collected no samples. Try a longer sample window.");
  } else if (hostBusyShare < 0.05) {
    warnings.push(
      `The extension host was idle (${(hostBusyShare * 100).toFixed(
        1
      )}% busy) — these scores mostly reflect startup, not live cost. Keep typing, saving and switching files during the sample for a real ranking.`
    );
  } else if (coreShare > 0.9) {
    warnings.push(
      "Almost all sampled CPU went to VS Code's own code, not your extensions. That is normal on an idle window; do some real work while profiling."
    );
  }
  if ((lag?.p95 ?? 0) > 100) {
    warnings.push(`Event-loop lag p95 is ${lag?.p95}ms — the extension host is blocking the main thread.`);
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    vscodeVersion: vscode.version,
    extensionHostPid: raw.pid,
    durationMs,
    totalSamples: raw.totalSamples,
    hostBusyShare,
    coreShare,
    heapUsedMb: raw.heapUsedMb,
    lag,
    startupTotalMs: startup.startupTotalMs,
    bootMs: startup.bootMs,
    startupTimeline: buildTimeline(startup),
    logFile: startup.logFile,
    rows,
    latency,
    audit,
    regression: null,
    stutters: ctx.stutters,
    background: ctx.background,
    session: ctx.session,
    warnings
  };

  report.regression = compareBaseline(ctx.baseline, report);
  return report;
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
    bootMs: startup.bootMs,
    startupTimeline: buildTimeline(startup),
    logFile: startup.logFile
  };
}
