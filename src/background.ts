/**
 * Background burn detector — "why is my fan loud when I'm not even using it?"
 *
 * Accumulates extension-host CPU only while the VS Code window is unfocused,
 * and closes a session when you come back. No profiling here on purpose: running
 * a profiler in the background to measure background CPU would be self-defeating.
 * The number is an aggregate, and the report says so.
 */

import * as vscode from "vscode";
import type { BackgroundSession } from "./types";

const TICK_MS = 1000;
const MIN_SESSION_SECONDS = 8;
const MAX_SESSIONS = 15;

export class BackgroundWatcher implements vscode.Disposable {
  private timer: NodeJS.Timeout | undefined;
  private subscription: vscode.Disposable | undefined;

  private sessions: BackgroundSession[] = [];
  private started: number | null = null;
  private cpuMs = 0;
  private wallMs = 0;
  private lastUsage = process.cpuUsage();
  private lastAt = Date.now();

  start(): void {
    if (this.timer) {
      return;
    }
    this.subscription = vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        this.closeSession();
      } else {
        this.openSession();
      }
    });
    this.timer = setInterval(() => this.tick(), TICK_MS);
    if (!vscode.window.state.focused) {
      this.openSession();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.subscription?.dispose();
    this.subscription = undefined;
    this.closeSession();
  }

  private openSession(): void {
    if (this.started !== null) {
      return;
    }
    this.started = Date.now();
    this.cpuMs = 0;
    this.wallMs = 0;
    this.lastUsage = process.cpuUsage();
    this.lastAt = Date.now();
  }

  private closeSession(): void {
    if (this.started === null) {
      return;
    }
    const start = this.started;
    this.started = null;
    const wallSeconds = this.wallMs / 1000;
    if (wallSeconds < MIN_SESSION_SECONDS) {
      return;
    }
    this.sessions.push({
      start,
      end: Date.now(),
      wallSeconds: Math.round(wallSeconds),
      cpuSeconds: Math.round((this.cpuMs / 1000) * 10) / 10,
      avgPct: Math.round((this.cpuMs / Math.max(1, this.wallMs)) * 1000) / 10
    });
    if (this.sessions.length > MAX_SESSIONS) {
      this.sessions.shift();
    }
  }

  private tick(): void {
    if (vscode.window.state.focused) {
      return;
    }
    this.openSession();

    const now = Date.now();
    const delta = process.cpuUsage(this.lastUsage);
    const elapsed = Math.max(1, now - this.lastAt);
    this.lastUsage = process.cpuUsage();
    this.lastAt = now;

    this.cpuMs += (delta.user + delta.system) / 1000;
    this.wallMs += elapsed;
  }

  /** Newest first. */
  snapshot(limit = 8): BackgroundSession[] {
    return [...this.sessions].slice(-limit).reverse();
  }

  /** Average CPU percentage across every finished background session. */
  averagePct(): number | null {
    if (this.sessions.length === 0) {
      return null;
    }
    const cpu = this.sessions.reduce((sum, s) => sum + s.cpuSeconds, 0);
    const wall = this.sessions.reduce((sum, s) => sum + s.wallSeconds, 0);
    return wall > 0 ? Math.round((cpu / wall) * 1000) / 10 : null;
  }

  dispose(): void {
    this.stop();
  }
}
