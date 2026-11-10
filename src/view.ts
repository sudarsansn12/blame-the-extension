import * as os from "os";
import * as vscode from "vscode";
import { toBaseline, type BaselineSnapshot } from "./baseline";
import type { BackgroundWatcher } from "./background";
import { refreshStartup, runProfile } from "./profiler";
import type { StutterRecorder } from "./recorder";
import { sessionMarkdown, shareCard } from "./reportcard";
import { shareLine, toMarkdown } from "./report";
import type { Report } from "./types";
import { getHtml } from "./webview";

const BASELINE_KEY = "blameTheExtension.baseline";

export class ProfileViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "blameTheExtension.view";

  private view: vscode.WebviewView | undefined;
  private report: Report | undefined;
  private running = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly recorder: StutterRecorder,
    private readonly background: BackgroundWatcher
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = getHtml();
    view.webview.onDidReceiveMessage((message: { type: string; id?: string }) => {
      void this.handleMessage(message);
    });
  }

  get lastReport(): Report | undefined {
    return this.report;
  }

  private post(message: unknown): void {
    void this.view?.webview.postMessage(message);
  }

  private async handleMessage(message: { type: string; id?: string }): Promise<void> {
    switch (message.type) {
      case "ready":
        if (this.report) {
          this.post({ type: "report", report: this.report });
        }
        this.post({ type: "running", value: this.running });
        this.post({
          type: "hudState",
          value: vscode.workspace.getConfiguration("blameTheExtension").get<boolean>("hud.enabled", false)
        });
        break;
      case "run":
        await this.runProfile();
        break;
      case "scan":
        await this.scanLogs();
        break;
      case "hud": {
        const enabled = await vscode.commands.executeCommand<boolean>("blameTheExtension.toggleHud");
        this.post({ type: "hudState", value: Boolean(enabled) });
        break;
      }
      case "copy":
        await this.copyReport();
        break;
      case "copyShare":
        if (this.report) {
          await vscode.env.clipboard.writeText(shareLine(this.report));
          vscode.window.setStatusBarMessage("Share line copied.", 2500);
        }
        break;
      case "copySession":
        if (this.report) {
          await vscode.env.clipboard.writeText(sessionMarkdown(this.report));
          vscode.window.setStatusBarMessage("Session report copied.", 2500);
        }
        break;
      case "export":
        await this.exportReport();
        break;
      case "open":
        if (message.id) {
          await openExtension(message.id);
        }
        break;
      default:
        break;
    }
  }

  async runProfile(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    this.post({ type: "running", value: true });

    try {
      const includeBuiltins = vscode.workspace
        .getConfiguration("blameTheExtension")
        .get<boolean>("showBuiltInExtensions", true);
      const baseline = this.context.globalState.get<BaselineSnapshot>(BASELINE_KEY) ?? null;
      const summary = this.recorder.summary();

      const report = await runProfile({
        includeBuiltins,
        baseline,
        stutters: this.recorder.snapshot(),
        background: this.background.snapshot(),
        session: {
          startedAt: new Date(summary.startedAt).toISOString(),
          uptimeSeconds: summary.uptimeSeconds,
          stutters: summary.stutters,
          worstLagMs: summary.worstLagMs,
          lossMs: summary.lossMs,
          backgroundCpuPct: this.background.averagePct()
        },
        onPhase: (message) => this.post({ type: "phase", message })
      });

      this.report = report;
      await this.context.globalState.update(BASELINE_KEY, toBaseline(report));
      const top = report.rows.find((row) => row.score > 0);
      this.recorder.setLastSuspect(top?.ext.id ?? null);

      this.post({ type: "report", report });
      this.post({ type: "running", value: false });
      this.announce(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.post({ type: "error", message });
      this.post({ type: "running", value: false });
      void vscode.window.showErrorMessage(`Blame the Extension: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private announce(report: Report): void {
    const top = report.rows.find((row) => row.score > 0);
    if (!top) {
      void vscode.window.showInformationMessage(
        "Blame the Extension: no extension stood out. Your setup looks clean."
      );
      return;
    }
    const pct =
      top.cpuPct >= 0.1 ? `${top.cpuPct.toFixed(1)}%` : `${(top.cpuShare * 100).toFixed(0)}% of busy time`;
    void vscode.window
      .showInformationMessage(`Top suspect: ${top.ext.id} — ${pct} CPU during the sample.`, "Open extension")
      .then((choice) => {
        if (choice === "Open extension") {
          void openExtension(top.ext.id);
        }
      });
  }

  async scanLogs(): Promise<void> {
    if (!this.report) {
      this.post({ type: "info", message: "Run a profile first — startup logs are merged into it." });
      return;
    }
    this.report = refreshStartup(this.report);
    this.post({ type: "report", report: this.report });
    this.post({ type: "info", message: "Startup data refreshed from the newest extension-host log." });
  }

  async copyReport(): Promise<void> {
    if (!this.report) {
      this.post({ type: "info", message: "Nothing to copy yet — run a profile." });
      return;
    }
    await vscode.env.clipboard.writeText(
      `${toMarkdown(this.report)}\n\n${sessionMarkdown(this.report)}`
    );
    vscode.window.setStatusBarMessage("Markdown report copied.", 2500);
  }

  async copySession(): Promise<void> {
    if (!this.report) {
      this.post({ type: "info", message: "Nothing to copy yet — run a profile." });
      return;
    }
    await vscode.env.clipboard.writeText(sessionMarkdown(this.report));
    vscode.window.setStatusBarMessage("Session report copied.", 2500);
  }

  async exportReport(): Promise<void> {
    if (!this.report) {
      this.post({ type: "info", message: "Nothing to export yet — run a profile." });
      return;
    }
    const target = await vscode.window.showSaveDialog({
      saveLabel: "Export report",
      filters: { JSON: ["json"] },
      defaultUri: vscode.Uri.joinPath(
        vscode.workspace.workspaceFolders?.[0]?.uri ?? vscode.Uri.file(os.homedir()),
        `extension-profile-${Date.now()}.json`
      )
    });
    if (!target) {
      return;
    }
    const body = JSON.stringify(this.report, null, 2);
    await vscode.workspace.fs.writeFile(target, Buffer.from(body, "utf8"));
    void vscode.window.showInformationMessage(`Report written to ${target.fsPath}`);
  }
}

export async function openExtension(id: string): Promise<void> {
  try {
    await vscode.commands.executeCommand("extension.open", id);
  } catch {
    await vscode.env.openExternal(vscode.Uri.parse(`vscode:extension/${id}`));
  }
}

export { shareCard };
