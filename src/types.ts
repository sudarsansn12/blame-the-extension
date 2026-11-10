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
  /** Share of all attributed extension-host CPU samples (0..1). Used for ranking. */
  cpuShare: number;
  /** Share of wall-clock time this extension burned one core (0..100). What users read. */
  cpuPct: number;
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

/** One slice of the startup waterfall. */
export interface TimelineSegment {
  id: string;
  label: string;
  startMs: number;
  durationMs: number;
  eager: boolean;
}

/** One benchmarked editor action. */
export interface ActionLatency {
  name: string;
  label: string;
  /** Median of the successful runs, in ms. */
  medianMs: number | null;
  runs: number;
  ok: boolean;
  note: string | null;
}

export interface LatencyReport {
  actions: ActionLatency[];
  /** Wall time the whole benchmark took. */
  durationMs: number;
  samples: number;
  /** Extension that burned the most CPU while the actions were running. */
  topExtension: { id: string; share: number } | null;
  attributed: boolean;
}

/** A potential problem found by the extension audit. */
export interface AuditFinding {
  title: string;
  detail: string;
  extensions: string[];
  severity: "high" | "medium" | "low";
}

/** One recorded freeze. */
export interface StutterEvent {
  /** Epoch milliseconds. */
  at: number;
  lagMs: number;
  cpuPct: number;
  file: string | null;
  /** Last extension identified as the top consumer, when a profile has run. */
  extension: string | null;
}

/** CPU burned while the window was in the background. */
export interface BackgroundSession {
  start: number;
  end: number;
  wallSeconds: number;
  cpuSeconds: number;
  avgPct: number;
}

/** Comparison against the previous profile. */
export interface Regression {
  previousAt: string;
  lagP95: { from: number; to: number };
  hostBusy: { from: number; to: number };
  startupMs: { from: number | null; to: number | null };
  verdict: "better" | "worse" | "same";
}

export interface SessionSummary {
  startedAt: string;
  uptimeSeconds: number;
  stutters: number;
  worstLagMs: number;
  /** Milliseconds the host spent blocked in stutters over the threshold. */
  lossMs: number;
  backgroundCpuPct: number | null;
}

export interface Report {
  generatedAt: string;
  vscodeVersion: string;
  extensionHostPid: number;
  /** Length of the CPU sampling window. */
  durationMs: number;
  /** CPU samples collected (≈ 1 per ms at default resolution). */
  totalSamples: number;
  /** Share of the sample window the extension host spent executing JS (0..1). */
  hostBusyShare: number;
  /** Share of samples that belong to VS Code's own code, not an extension. */
  coreShare: number;
  heapUsedMb: number;
  lag: LagStats | null;
  /** Total startup time from "Extension host started" to "Eager extensions activated". */
  startupTotalMs: number | null;
  /** Time from host start to the first extension activation. */
  bootMs: number | null;
  /** Ordered startup waterfall. */
  startupTimeline: TimelineSegment[];
  logFile: string | null;
  rows: Row[];
  latency: LatencyReport | null;
  audit: AuditFinding[];
  regression: Regression | null;
  stutters: StutterEvent[];
  background: BackgroundSession[];
  session: SessionSummary;
  warnings: string[];
}
