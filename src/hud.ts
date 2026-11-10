/**
 * Live performance HUD — the FPS counter for VS Code.
 *
 * A status bar item that updates continuously with two numbers that actually
 * correlate with "my editor feels laggy":
 *
 *   - event-loop lag  : how late the extension host's timer fires (ms)
 *   - host CPU        : how much of one core the extension host is burning (%)
 *
 * Plus a sparkline of the last ten lag readings, because a number alone is a
 * report and a number with a graph is a dashboard.
 *
 * It turns amber above 40ms and red above 100ms, which is where typing starts
 * to feel sticky.
 */

import * as vscode from "vscode";

const LAG_INTERVAL_MS = 100;
const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const SPARK_POINTS = 10;
const METER_POINTS = 3;
const WARN_LAG = 40;
const BAD_LAG = 100;
const WARN_CPU = 55;
const BAD_CPU = 80;

type HudStyle = "number" | "meter" | "minimal";

function sparkline(values: number[]): string {
  if (values.length === 0) {
    return "";
  }
  return values
    .map((value) => {
      const bucket = Math.min(SPARK_CHARS.length - 1, Math.max(0, Math.floor(value / 15)));
      return SPARK_CHARS[bucket];
    })
    .join("");
}

export class Hud implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private lagTimer: NodeJS.Timeout | undefined;
  private renderTimer: NodeJS.Timeout | undefined;

  private lagSamples: number[] = [];
  private sparkValues: number[] = [];
  private lastTick = 0;
  private lastUsage = process.cpuUsage();
  private lastUsageAt = Date.now();
  private stutters = 0;
  private maxLag = 0;
  private startedAt = 0;
  private cpu = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = "Blame the Extension";
    this.item.command = "blameTheExtension.runProfile";
  }

  get running(): boolean {
    return this.lagTimer !== undefined;
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.lagSamples = [];
    // Pre-fill so the item never changes width while warming up. This was the
    // cause of the status bar "jiggling" on start.
    this.sparkValues = new Array<number>(SPARK_POINTS).fill(0);
    this.stutters = 0;
    this.maxLag = 0;
    this.startedAt = Date.now();
    this.lastUsage = process.cpuUsage();
    this.lastUsageAt = Date.now();
    this.lastTick = performance.now();

    this.lagTimer = setInterval(() => this.sampleLag(), LAG_INTERVAL_MS);
    this.renderTimer = setInterval(() => this.render(), this.updateMs());
    this.item.show();
    this.render();
  }

  stop(): void {
    if (this.lagTimer) {
      clearInterval(this.lagTimer);
      this.lagTimer = undefined;
    }
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = undefined;
    }
    this.item.hide();
  }

  async toggle(): Promise<boolean> {
    const enabled = !this.running;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
    await vscode.workspace
      .getConfiguration("blameTheExtension")
      .update("hud.enabled", enabled, vscode.ConfigurationTarget.Global);
    vscode.window.setStatusBarMessage(
      enabled
        ? "Live HUD on — watch the number while you type."
        : "Live HUD off. Your scores are still in the sidebar.",
      3000
    );
    return enabled;
  }

  private updateMs(): number {
    const value = vscode.workspace
      .getConfiguration("blameTheExtension")
      .get<number>("hud.updateMs", 1000);
    return Math.max(200, Math.min(5000, value));
  }

  private style(): HudStyle {
    const value = vscode.workspace
      .getConfiguration("blameTheExtension")
      .get<string>("hud.style", "number");
    return value === "meter" || value === "minimal" ? value : "number";
  }

  private sampleLag(): void {
    const now = performance.now();
    const drift = Math.max(0, now - this.lastTick - LAG_INTERVAL_MS);
    this.lastTick = now;

    this.lagSamples.push(drift);
    if (this.lagSamples.length > 60) {
      this.lagSamples.shift();
    }
    if (drift > BAD_LAG) {
      this.stutters++;
    }
    if (drift > this.maxLag) {
      this.maxLag = drift;
    }
  }

  private sampleCpu(): number {
    const now = Date.now();
    const delta = process.cpuUsage(this.lastUsage);
    const elapsed = Math.max(1, now - this.lastUsageAt);
    this.lastUsage = process.cpuUsage();
    this.lastUsageAt = now;
    const busyMs = (delta.user + delta.system) / 1000;
    return Math.max(0, Math.min(100, (busyMs / elapsed) * 100));
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) {
      return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  }

  private render(): void {
    if (!this.running) {
      return;
    }
    this.cpu = this.sampleCpu();

    const recent = this.lagSamples.slice(-5);
    const lagNow = recent.length > 0 ? Math.max(...recent) : 0;

    this.sparkValues.push(lagNow);
    if (this.sparkValues.length > SPARK_POINTS) {
      this.sparkValues.shift();
    }

    const text = this.composeText(lagNow);
    if (text !== this.item.text) {
      this.item.text = text;
    }
    this.item.tooltip = this.tooltip(lagNow);
    this.item.backgroundColor =
      lagNow > BAD_LAG || this.cpu > BAD_CPU
        ? new vscode.ThemeColor("statusBarItem.errorBackground")
        : lagNow > WARN_LAG || this.cpu > WARN_CPU
          ? new vscode.ThemeColor("statusBarItem.warningBackground")
          : undefined;
  }

  /**
   * Constant-width by construction: every style keeps the same character count
   * no matter the reading, so the status bar never reflows.
   */
  private composeText(lagNow: number): string {
    const style = this.style();
    if (style === "minimal") {
      return "$(pulse)";
    }
    if (style === "meter") {
      return `$(pulse) ${sparkline(this.sparkValues.slice(-METER_POINTS))}`;
    }
    // Zero-padded to 3 digits so "8" and "120" occupy the same width.
    const value = String(Math.min(999, Math.round(lagNow))).padStart(3, "0");
    return `$(pulse) ${value}ms ${sparkline(this.sparkValues)}`;
  }

  private tooltip(lagNow: number): vscode.MarkdownString {
    const uptime = Math.round((Date.now() - this.startedAt) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Blame the Extension — live**\n\n`);
    md.appendMarkdown(`- Lag now: **${Math.round(lagNow)}ms**\n`);
    md.appendMarkdown(
      `- Lag p95: ${Math.round(this.percentile(this.lagSamples, 95))}ms · max ${Math.round(this.maxLag)}ms\n`
    );
    md.appendMarkdown(`- Host CPU: ${this.cpu.toFixed(0)}%\n`);
    md.appendMarkdown(`- Stutters over ${BAD_LAG}ms: **${this.stutters}**\n`);
    md.appendMarkdown(`- Running for ${minutes}m ${seconds}s\n\n`);
    md.appendMarkdown(`Click for a full ranked profile.`);
    return md;
  }

  dispose(): void {
    this.stop();
    this.item.dispose();
  }
}
