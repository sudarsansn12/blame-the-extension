/**
 * Reads VS Code's own extension-host log to reconstruct startup cost.
 *
 * VS Code writes one line per activation:
 *
 *   2026-11-08 21:07:03.746 [info] ExtensionService#_doActivateExtension
 *     vscode.git-base, startup: true, activationEvent: '*', root cause: vscode.git
 *
 * Newer builds sometimes append "activationTime: 250ms"; older ones do not.
 * When the field is missing we fall back to the delta between consecutive
 * activation lines, which is a good proxy because the extension host activates
 * extensions sequentially.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface LogActivation {
  id: string;
  startup: boolean;
  activationEvent: string | null;
  /** Milliseconds between this activation and the previous one. */
  deltaMs: number | null;
  /** Value from "activationTime: Nms" when VS Code logged it. */
  reportedMs: number | null;
}

export interface StartupInfo {
  logFile: string | null;
  /** "Extension host with pid N started" -> "Eager extensions activated". */
  startupTotalMs: number | null;
  activations: Map<string, LogActivation>;
}

const ACTIVATE_RE =
  /ExtensionService#_doActivateExtension\s+([^,\s]+),\s*startup:\s*(true|false)(?:,\s*activationEvent:\s*'([^']*)')?.*?(?:activationTime:\s*(\d+)ms)?/;

const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\.\d{3})/;

const HOST_STARTED_RE = /Extension host with pid (\d+) started/;
const EAGER_DONE_RE = /Eager extensions activated/;

/** Deltas larger than this are user-triggered lazy activations, not startup cost. */
const MEANINGFUL_DELTA_MS = 5000;

function logRoots(): string[] {
  const home = os.homedir();
  const appData = process.env.APPDATA;
  const roots: string[] = [];

  if (appData) {
    for (const flavour of ["Code", "Code - Insiders", "VSCodium", "Cursor", "Windsurf"]) {
      roots.push(path.join(appData, flavour, "logs"));
    }
  }
  roots.push(
    path.join(home, "Library", "Application Support", "Code", "logs"),
    path.join(home, "Library", "Application Support", "Code - Insiders", "logs"),
    path.join(home, ".config", "Code", "logs"),
    path.join(home, ".config", "Code - Insiders", "logs"),
    path.join(home, ".vscode-server", "data", "logs"),
    path.join(home, ".vscode-server-insiders", "data", "logs")
  );
  return roots;
}

/** Every `<logs>/<session>/window<N>/exthost/exthost.log`, newest first. */
export function findLogFiles(): string[] {
  const found: { file: string; mtime: number }[] = [];

  for (const root of logRoots()) {
    let sessions: string[] = [];
    try {
      sessions = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const session of sessions) {
      const sessionDir = path.join(root, session);
      let windows: string[] = [];
      try {
        windows = fs.readdirSync(sessionDir);
      } catch {
        continue;
      }
      for (const window of windows) {
        const log = path.join(sessionDir, window, "exthost", "exthost.log");
        try {
          const stat = fs.statSync(log);
          found.push({ file: log, mtime: stat.mtimeMs });
        } catch {
          /* not a window folder */
        }
      }
    }
  }

  return found.sort((a, b) => b.mtime - a.mtime).map((f) => f.file);
}

function parseTimestamp(line: string): number | null {
  const m = TIMESTAMP_RE.exec(line);
  if (!m) {
    return null;
  }
  const value = Date.parse(m[1].replace(" ", "T"));
  return Number.isNaN(value) ? null : value;
}

/**
 * Parse the newest log that actually contains activation records.
 * Returns an empty activation map when nothing usable is found.
 */
export function readStartupInfo(): StartupInfo {
  const empty: StartupInfo = { logFile: null, startupTotalMs: null, activations: new Map() };

  for (const file of findLogFiles()) {
    let text: string;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!text.includes("_doActivateExtension")) {
      continue;
    }

    const lines = text.split(/\r?\n/);

    // Only look at the most recent extension-host boot in this file.
    let bootIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (HOST_STARTED_RE.test(lines[i])) {
        bootIndex = i;
        break;
      }
    }
    const start = bootIndex >= 0 ? bootIndex : 0;

    const activations = new Map<string, LogActivation>();
    let bootAt: number | null = null;
    let eagerAt: number | null = null;
    let previousAt: number | null = null;

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];

      if (bootIndex >= 0 && i === bootIndex) {
        bootAt = parseTimestamp(line);
        continue;
      }
      if (EAGER_DONE_RE.test(line)) {
        eagerAt = parseTimestamp(line);
        continue;
      }

      const match = ACTIVATE_RE.exec(line);
      if (!match) {
        continue;
      }
      const at = parseTimestamp(line);
      const id = match[1];
      const reported = match[4] ? Number(match[4]) : null;

      let delta: number | null = null;
      if (at !== null) {
        const reference = previousAt ?? bootAt;
        if (reference !== null) {
          const diff = at - reference;
          if (diff >= 0 && diff <= MEANINGFUL_DELTA_MS) {
            delta = diff;
          }
        }
        previousAt = at;
      }

      const existing = activations.get(id);
      // Keep the most expensive observation for an extension that activated more than once.
      if (existing && (existing.deltaMs ?? 0) >= (delta ?? 0) && existing.reportedMs !== null) {
        continue;
      }

      activations.set(id, {
        id,
        startup: match[2] === "true",
        activationEvent: match[3] ?? null,
        deltaMs: delta,
        reportedMs: reported
      });
    }

    const startupTotalMs =
      bootAt !== null && eagerAt !== null && eagerAt >= bootAt ? eagerAt - bootAt : null;

    return { logFile: file, startupTotalMs, activations };
  }

  return empty;
}
