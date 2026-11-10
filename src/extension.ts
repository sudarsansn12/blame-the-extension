import * as vscode from "vscode";
import { ProfileViewProvider, openExtension } from "./view";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ProfileViewProvider();

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
    vscode.commands.registerCommand("blameTheExtension.openExtension", (id: string) => openExtension(id))
  );
}

export function deactivate(): void {
  /* nothing to clean up */
}
