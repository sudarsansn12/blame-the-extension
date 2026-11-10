/**
 * Shared types for the profiler.
 *
 * Everything here is plain data so it can be serialised straight into the
 * webview, exported as JSON, or rendered as Markdown.
 */

export interface ExtInfo {
  id: string;
  publisher: string;
  name: string;
  version: string;
  displayName: string;
  description: string;
  isBuiltin: boolean;
  isActive: boolean;
  extensionPath: string;
}

/** A hot function inside an extension. */
export interface TopFunction {
  name: string;
  /** Basename of the file the samples came from. */
  file: string;
  samples: number;
  /** Share of this extension's own samples (0..1). */
  share: number;
}

/** One row of the final ranking. */
export interface Row {
  ext: ExtInfo;
  /** Share of all extension-host CPU samples attributed to this extension (0..1). */
  cpuShare: number;
  /** Estimated CPU milliseconds burned during the sample window. */
  cpuMs: number;
  /** Startup cost proxy taken from the extension host log, in ms. */
  activationMs: number | null;
  /** True when the extension activates during startup ("startup: true" in the log). */
  eager: boolean;
  /** The activation event that woke it up, when known. */
  activationEvent: string | null;
  /** 0..100 composite cost score. */
  score: number;
  verdict: "blame" | "watch" | "fine" | "idle";
  /** Up to five hottest functions inside this extension. */
  topFunctions: TopFunction[];
}

export interface LagStats {
  p50: number;
  p95: number;
  max: number;
  samples: number;
}

export interface Report {
  generatedAt: string;
  vscodeVersion: string;
  extensionHostPid: number;
  /** Length of the CPU sampling window. */
  durationMs: number;
  /** CPU samples collected (≈ 1 per ms at default resolution). */
  totalSamples: number;
  /** Share of samples that belong to VS Code's own code, not an extension. */
  coreShare: number;
  heapUsedMb: number;
  lag: LagStats | null;
  /** Total startup time from "Extension host started" to "Eager extensions activated". */
  startupTotalMs: number | null;
  logFile: string | null;
  rows: Row[];
  warnings: string[];
}
