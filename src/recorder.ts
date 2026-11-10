/**
 * Stutter flight recorder.
 *
 * A 250ms heartbeat. When the extension host is blocked for longer than the
 * threshold, the gap shows up as drift, and we store the context around it:
 * when, how long, which file was open, how busy the CPU was.
 *
 * Cheap by design: four wake-ups per second, and only spikes are retained.
 */

import * as path from "path";
import * as vscode from "vscode";
import type { StutterEvent } from "./types";

const INTERVAL_MS = 250;
const STUTTER_MS = 100;
const MAX_EVENTS = 40;

export class StutterRecorder implements vscode.Disposable {
  private timer: NodeJS.Timeout | undefined;
  private lastTick = 0;
  private lastUsage = process.cpuUsage();
  private lastUsageAt = Date.now();

  private events: StutterEvent[] = [];
  private stutterCount = 0;
  private worstLag = 0;
  private lossMs = 0;
  private lastSuspect: string | null = null;
  private readonly startedAt = Date.now();

  start(): void {
    if (this.timer) {
      return;
    }
    this.lastTick = performance.now();
    this.lastUsage = process.cpuUsage();
    this.lastUsageAt = Date.now();
    this.timer = setInterval(() => this.tick(), INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  setLastSuspect(id: string | null): void {
    this.lastSuspect = id;
  }

  private cpuPercent(): number {
    const now = Date.now();
    const delta = process.cpuUsage(this.lastUsage);
    const elapsed = Math.max(1, now - this.lastUsageAt);
    this.lastUsage = process.cpuUsage();
    this.lastUsageAt = now;
    const busyMs = (delta.user + delta.system) / 1000;
    return Math.max(0, Math.min(100, (busyMs / elapsed) * 100));
  }

  private tick(): void {
    const now = performance.now();
    const lag = Math.max(0, now - this.lastTick - INTERVAL_MS);
    this.lastTick = now;

    if (lag > this.worstLag) {
      this.worstLag = lag;
    }

    if (lag <= STUTTER_MS) {
      return;
    }

    this.stutterCount++;
    this.lossMs += lag;

    const editor = vscode.window.activeTextEditor;
    const file = editor ? path.basename(editor.document.fileName) : null;

    this.events.push({
      at: Date.now(),
      lagMs: Math.round(lag),
      cpuPct: Math.round(this.cpuPercent() * 10) / 10,
      file,
      extension: this.lastSuspect
    });
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }
  }

  /** Newest first. */
  snapshot(limit = 15): StutterEvent[] {
    return [...this.events].slice(-limit).reverse();
  }

  summary(): {
    startedAt: number;
    uptimeSeconds: number;
    stutters: number;
    worstLagMs: number;
    lossMs: number;
  } {
    return {
      startedAt: this.startedAt,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      stutters: this.stutterCount,
      worstLagMs: Math.round(this.worstLag),
      lossMs: Math.round(this.lossMs)
    };
  }

  dispose(): void {
    this.stop();
  }
}
