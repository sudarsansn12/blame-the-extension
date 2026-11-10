import type { Report } from "./types";

function duration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds % 60}s`;
}

function clock(epoch: number): string {
  const date = new Date(epoch);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** The end-of-session brag card. Copyable Markdown. */
export function sessionMarkdown(report: Report): string {
  const top = report.rows.find((row) => row.cpuPct > 0);
  const lines: string[] = [];

  lines.push(`### VS Code session report`);
  lines.push("");
  lines.push(`- Session: ${duration(report.session.uptimeSeconds)}`);
  lines.push(`- Stutters over 100ms: **${report.session.stutters}**`);
  lines.push(`- Worst freeze: ${report.session.worstLagMs}ms`);
  lines.push(`- Time spent blocked: ${(report.session.lossMs / 1000).toFixed(1)}s`);
  if (report.session.backgroundCpuPct !== null) {
    lines.push(`- CPU used while unfocused: ${report.session.backgroundCpuPct}%`);
  }
  if (top) {
    lines.push(`- Top offender: \`${top.ext.id}\` at ${top.cpuPct.toFixed(1)}% CPU`);
  }

  const slowest = (report.latency?.actions ?? [])
    .filter((action) => action.ok && action.medianMs !== null)
    .sort((a, b) => (b.medianMs ?? 0) - (a.medianMs ?? 0))[0];
  if (slowest) {
    lines.push(`- Slowest action: ${slowest.label} at ${slowest.medianMs}ms`);
  }

  return lines.join("\n");
}

/** One-line version for the clipboard badge. */
export function shareCard(report: Report): string {
  const top = report.rows.find((row) => row.cpuPct > 0);
  const parts = ['Blame the Extension'];
  parts.push(`${report.session.stutters} stutters`);
  parts.push(`worst ${report.session.worstLagMs}ms`);
  if (top) {
    parts.push(`top ${top.ext.id} ${top.cpuPct.toFixed(1)}%`);
  }
  return parts.join(" · ");
}

export { clock };
