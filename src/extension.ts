import * as vscode from "vscode";
import { Hud } from "./hud";
import { ProfileViewProvider, openExtension } from "./view";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ProfileViewProvider();
  const hud = new Hud();
  context.subscriptions.push(hud);

  // Only pay activation cost when the user asked for the live HUD. When it is
  // off, activate() does nothing but register commands.
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
    vscode.commands.registerCommand("blameTheExtension.exportReport", () => provider.exportReport()),
    vscode.commands.registerCommand("blameTheExtension.toggleHud", () => hud.toggle()),
    vscode.commands.registerCommand("blameTheExtension.openExtension", (id: string) => openExtension(id))
  );
}

export function deactivate(): void {
  /* the Hud is disposed through context.subscriptions */
}
