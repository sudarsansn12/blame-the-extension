import * as vscode from "vscode";
import { BackgroundWatcher } from "./background";
import { Hud } from "./hud";
import { StutterRecorder } from "./recorder";
import { ProfileViewProvider, openExtension } from "./view";

export function activate(context: vscode.ExtensionContext): void {
  // Always-on, extremely cheap: a 250ms heartbeat for stutters and a 1s tick
  // that only accumulates while the window is unfocused.
  const recorder = new StutterRecorder();
  recorder.start();
  const background = new BackgroundWatcher();
  background.start();
  context.subscriptions.push(recorder, background);

  const provider = new ProfileViewProvider(context, recorder, background);
  const hud = new Hud();
  context.subscriptions.push(hud);

  if (vscode.workspace.getConfiguration("blameTheExtension").get<boolean>("hud.enabled", false)) {
    hud.start();
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ProfileViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("blameTheExtension.runProfile", () => provider.runProfile()),
    vscode.commands.registerCommand("blameTheExtension.scanLogs", () => provider.scanLogs()),
    vscode.commands.registerCommand("blameTheExtension.copyReport", () => provider.copyReport()),
    vscode.commands.registerCommand("blameTheExtension.copySession", () => provider.copySession()),
    vscode.commands.registerCommand("blameTheExtension.exportReport", () => provider.exportReport()),
    vscode.commands.registerCommand("blameTheExtension.toggleHud", () => hud.toggle()),
    vscode.commands.registerCommand("blameTheExtension.openExtension", (id: string) => openExtension(id))
  );
}

export function deactivate(): void {
  /* everything is disposed through context.subscriptions */
}
