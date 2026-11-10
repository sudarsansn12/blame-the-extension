import type { Report } from "./types";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Human-readable Markdown report — this is what people paste into issues/Slack. */
export function toMarkdown(report: Report, limit = 15): string {
  const rows = report.rows.slice(0, limit);
  const lines: string[] = [];

  lines.push(`### VS Code extension profile`);
  lines.push("");
  lines.push(`- Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push(`- VS Code ${report.vscodeVersion} · extension host PID ${report.extensionHostPid}`);
  lines.push(`- Sampled ${(report.durationMs / 1000).toFixed(0)}s · ${report.totalSamples.toLocaleString()} CPU samples`);
  lines.push(`- Host busy: ${(report.hostBusyShare * 100).toFixed(0)}% of the window`);
  lines.push(`- Extension host heap: ${report.heapUsedMb} MB`);
  if (report.lag) {
    lines.push(`- Event-loop lag: p50 ${report.lag.p50}ms · p95 ${report.lag.p95}ms · max ${report.lag.max}ms`);
  }
  if (report.startupTotalMs !== null) {
    lines.push(`- Startup (host start → eager extensions done): ${report.startupTotalMs}ms`);
  }
  lines.push("");
  lines.push("| # | Extension | CPU | Startup | Score |");
  lines.push("|---|-----------|-----|---------|-------|");
  rows.forEach((row, index) => {
    const startup = row.activationMs === null ? "—" : `${row.activationMs}ms${row.eager ? " (eager)" : ""}`;
    const label = row.ext.isBuiltin ? `${row.ext.id} (built-in)` : row.ext.id;
    lines.push(
      `| ${index + 1} | \`${label}\` | ${row.cpuPct.toFixed(1)}% | ${startup} | ${row.score} |`
    );
  });

  if (rows.length > 0 && rows[0].score > 0) {
    lines.push("");
    lines.push(`**Top suspect: \`${rows[0].ext.id}\`** — ${pct(rows[0].cpuShare)} of extension-host CPU.`);
  }

  return lines.join("\n");
}

/** One-line brag/share text. */
export function shareLine(report: Report): string {
  const top = report.rows.find((row) => row.score > 0);
  if (!top) {
    return "My VS Code extension host is clean. 0 suspects. (Blame the Extension)";
  }
  return `My VS Code extension host spends ${pct(top.cpuShare)} of its CPU on ${top.ext.id}. Found with "Blame the Extension".`;
}
