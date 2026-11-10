/**
 * Per-action latency — the number users actually feel.
 *
 * "34% CPU" means nothing to a human. "Saving costs 1.4s" means everything.
 * These benchmarks ask VS Code to run the same providers the editor runs on
 * save / completion / hover, time them, and never apply the results, so nothing
 * is modified.
 *
 * Each call is raced against a timeout: one broken extension should not hang
 * the profiler, it should show up as a failed action.
 */

import * as vscode from "vscode";
import type { ActionLatency, LatencyReport } from "./types";

const RUNS = 3;
const TIMEOUT_MS = 4000;

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

async function timeOnce(run: () => Thenable<unknown>): Promise<number | null> {
  const started = performance.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
    });
    await Promise.race([Promise.resolve(run()), timeout]);
    return performance.now() - started;
  } catch {
    return null;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function measure(
  name: string,
  label: string,
  run: () => Thenable<unknown>
): Promise<ActionLatency> {
  const timings: number[] = [];
  let failures = 0;
  for (let i = 0; i < RUNS; i++) {
    const elapsed = await timeOnce(run);
    if (elapsed === null) {
      failures++;
    } else {
      timings.push(elapsed);
    }
  }
  const value = median(timings);
  return {
    name,
    label,
    medianMs: value === null ? null : Math.round(value * 10) / 10,
    runs: timings.length,
    ok: value !== null,
    note: value === null ? (failures === RUNS ? "no provider responded" : "timed out") : null
  };
}

/** Runs the action benchmark. Returns an empty report when there is nothing to measure. */
export async function measureActions(): Promise<Omit<LatencyReport, "topExtension" | "attributed">> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      actions: [
        {
          name: "none",
          label: "Open a file first",
          medianMs: null,
          runs: 0,
          ok: false,
          note: "action latency needs an open editor to benchmark"
        }
      ],
      durationMs: 0,
      samples: 0
    };
  }

  const document = editor.document;
  const position = editor.selection.active;
  const formatOptions = { tabSize: 4, insertSpaces: true };
  const started = performance.now();

  const actions: ActionLatency[] = [];
  actions.push(
    await measure("format", "Save / format", () =>
      vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", document.uri, formatOptions)
    )
  );
  actions.push(
    await measure("completion", "Completion", () =>
      vscode.commands.executeCommand("vscode.executeCompletionItemProvider", document.uri, position)
    )
  );
  actions.push(
    await measure("hover", "Hover", () =>
      vscode.commands.executeCommand("vscode.executeHoverProvider", document.uri, position)
    )
  );
  actions.push(
    await measure("definition", "Go to definition", () =>
      vscode.commands.executeCommand("vscode.executeDefinitionProvider", document.uri, position)
    )
  );

  return {
    actions,
    durationMs: Math.round(performance.now() - started),
    samples: actions.reduce((sum, action) => sum + action.runs, 0)
  };
}
