/**
 * Baseline & regression — "am I worse than last week?"
 *
 * A single snapshot is stored in globalState after every profile. The next run
 * diffs against it. Deliberately simple: the point is a direction of travel,
 * not statistics.
 */

import type { Regression, Report } from "./types";

export interface BaselineSnapshot {
  at: string;
  lagP95: number;
  hostBusy: number;
  startupMs: number | null;
  topExtension: string | null;
  topCpuPct: number;
}

export function toBaseline(report: Report): BaselineSnapshot {
  const top = report.rows.find((row) => row.cpuPct > 0) ?? report.rows[0];
  return {
    at: report.generatedAt,
    lagP95: report.lag?.p95 ?? 0,
    hostBusy: report.hostBusyShare,
    startupMs: report.startupTotalMs,
    topExtension: top?.ext.id ?? null,
    topCpuPct: top?.cpuPct ?? 0
  };
}

const MEANINGFUL = 0.2;

export function compareBaseline(previous: BaselineSnapshot | null, report: Report): Regression | null {
  if (!previous) {
    return null;
  }
  const from = {
    lagP95: previous.lagP95,
    hostBusy: previous.hostBusy,
    startupMs: previous.startupMs
  };
  const to = {
    lagP95: report.lag?.p95 ?? 0,
    hostBusy: report.hostBusyShare,
    startupMs: report.startupTotalMs
  };

  const ratio = (a: number, b: number): number => {
    if (a <= 0 && b <= 0) {
      return 1;
    }
    if (a <= 0) {
      return b > 0 ? 2 : 1;
    }
    return b / a;
  };

  const lagRatio = ratio(from.lagP95, to.lagP95);
  const busyRatio = ratio(from.hostBusy, to.hostBusy);

  let verdict: Regression["verdict"] = "same";
  if (lagRatio > 1 + MEANINGFUL || busyRatio > 1 + MEANINGFUL) {
    verdict = "worse";
  } else if (lagRatio < 1 - MEANINGFUL || busyRatio < 1 - MEANINGFUL) {
    verdict = "better";
  }

  return {
    previousAt: previous.at,
    lagP95: { from: from.lagP95, to: to.lagP95 },
    hostBusy: { from: from.hostBusy, to: to.hostBusy },
    startupMs: { from: from.startupMs, to: to.startupMs },
    verdict
  };
}
