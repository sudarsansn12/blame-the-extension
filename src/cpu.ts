/**
 * Live measurement of the extension host.
 *
 * Two independent signals:
 *
 *  1. CPU profile via Node's in-process inspector. Every sample carries the
 *     script URL of the frame that was running, so we can attribute CPU time
 *     to the extension folder it came from. This is the only reliable way to
 *     answer "which extension is burning CPU right now?" without restarting
 *     anything.
 *
 *  2. Event-loop lag. A 50ms timer that measures how late it actually fires.
 *     High lag = the UI thread inside the extension host is blocked, which is
 *     what users experience as "VS Code feels sluggish".
 */

import * as inspector from "inspector";

export interface UrlSample {
  samples: number;
  functions: Map<string, number>;
}

export interface RawProfile {
  durationMs: number;
  totalSamples: number;
  byUrl: Map<string, UrlSample>;
  heapUsedMb: number;
  pid: number;
}

export interface LagReport {
  p50: number;
  p95: number;
  max: number;
  samples: number;
}

function post<T>(session: inspector.Session, method: string, params: object = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    session.post(method, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result as T);
      }
    });
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

export function startLagMonitor(_durationMs: number): { stop: () => LagReport } {
  const interval = 50;
  const deltas: number[] = [];
  let last = performance.now();

  const timer = setInterval(() => {
    const now = performance.now();
    deltas.push(Math.max(0, now - last - interval));
    last = now;
  }, interval);

  return {
    stop: () => {
      clearInterval(timer);
      const sorted = [...deltas].sort((a, b) => a - b);
      return {
        p50: Math.round(percentile(sorted, 50)),
        p95: Math.round(percentile(sorted, 95)),
        max: Math.round(sorted[sorted.length - 1] ?? 0),
        samples: sorted.length
      };
    }
  };
}

interface CpuProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    url: string;
    lineNumber: number;
  };
  hitCount?: number;
}

interface CpuProfile {
  nodes: CpuProfileNode[];
  samples?: number[];
}

export interface ProfileDigest {
  totalSamples: number;
  byUrl: Map<string, UrlSample>;
}

/** Turn a raw V8 profile into per-script sample counts. */
export function digestProfile(profile: CpuProfile): ProfileDigest {
  const urlByNode = new Map<number, string>();
  const fnByNode = new Map<number, string>();
  for (const node of profile.nodes) {
    urlByNode.set(node.id, node.callFrame.url || "(native)");
    fnByNode.set(
      node.id,
      node.callFrame.functionName || (node.callFrame.url ? "(anonymous)" : "(native)")
    );
  }

  const byUrl = new Map<string, UrlSample>();
  const bump = (url: string, fn: string, count: number) => {
    let entry = byUrl.get(url);
    if (!entry) {
      entry = { samples: 0, functions: new Map() };
      byUrl.set(url, entry);
    }
    entry.samples += count;
    entry.functions.set(fn, (entry.functions.get(fn) ?? 0) + count);
  };

  let totalSamples = 0;
  if (profile.samples && profile.samples.length > 0) {
    for (const nodeId of profile.samples) {
      const url = urlByNode.get(nodeId) ?? "(unknown)";
      bump(url, fnByNode.get(nodeId) ?? "(anonymous)", 1);
      totalSamples++;
    }
  } else {
    for (const node of profile.nodes) {
      const hits = node.hitCount ?? 0;
      if (hits > 0) {
        bump(node.callFrame.url || "(native)", node.callFrame.functionName || "(native)", hits);
        totalSamples += hits;
      }
    }
  }

  return { totalSamples, byUrl };
}

export interface RunningProfiler {
  stop: () => Promise<ProfileDigest>;
}

/**
 * Start a profiler session and leave it running. Used when the length of the
 * work is unknown, for example when benchmarking editor actions.
 */
export async function startProfiler(): Promise<RunningProfiler> {
  const session = new inspector.Session();
  session.connect();
  await post(session, "Profiler.enable");
  await post(session, "Profiler.setSamplingInterval", { interval: 1000 });
  await post(session, "Profiler.start");

  let finished = false;
  return {
    stop: async () => {
      if (finished) {
        return { totalSamples: 0, byUrl: new Map() };
      }
      finished = true;
      try {
        const { profile } = await post<{ profile: CpuProfile }>(session, "Profiler.stop");
        return digestProfile(profile);
      } finally {
        try {
          session.disconnect();
        } catch {
          /* already gone */
        }
      }
    }
  };
}

/**
 * CPU-profile the extension host for `durationMs`.
 * Throws when the inspector cannot be attached (rare, but possible when another
 * debugger owns the process).
 */
export async function profileExtensionHost(durationMs: number): Promise<RawProfile> {
  const running = await startProfiler();
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  const digest = await running.stop();

  return {
    durationMs,
    totalSamples: digest.totalSamples,
    byUrl: digest.byUrl,
    heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
    pid: process.pid
  };
}
