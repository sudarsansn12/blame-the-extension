# Blame the Extension

**Find the extension that is slowing down your VS Code.**

Every developer has had the thought: *"my editor feels slow — is it an extension?"* Then they spend an hour disabling extensions one by one, or give up and live with it.

Blame the Extension answers it in 10 seconds. It samples the extension host's CPU, reads VS Code's own startup log, and ranks every installed extension by what it actually costs you.

<!--
  Before publishing, drop a real screenshot at media/screenshot.png and add:
  ![Blame the Extension sidebar](media/screenshot.png)
  A 5-second GIF of the ranked list beats every word in this file.
-->

## What you get

- **Live HUD.** A status bar readout that ticks continuously — lag in ms plus a sparkline — and turns amber/red when the editor starts to stutter. Like an FPS counter, except the number is how long your keystroke waits.
- **Live CPU attribution.** Node's inspector profiles the extension host and every sample is traced back to the extension folder it came from. Not a guess — actual samples.
- **Startup cost per extension.** Parsed from VS Code's `exthost.log`: which extensions activate eagerly, and how long each one took.
- **Event-loop lag.** p50 / p95 / max. If p95 is over 100ms, something is blocking the extension host and that's the "sluggish" feeling.
- **A single 0–100 score** per extension, so you do not have to interpret three numbers.
- **One-click open** of the offending extension's page so you can disable it.
- **Copy as Markdown / export as JSON** for bug reports, Slack, or your own records.

## Use it

1. Open the **Blame the Extension** icon in the activity bar.
2. Press **Start live HUD** — a readout appears in the status bar: `⚡ 12ms ▂▃▂▁▂▃▅`.
   Type, save, switch files. Watch it spike. That is the whole point: the number is
   always there, so you catch the moment something misbehaves instead of guessing later.
3. When it goes red, press **Run profile** for the ranked list of who did it.
4. Click any row to expand the hottest functions inside that extension.
5. Open and disable the suspect, then watch the HUD to confirm the number dropped.

> Tip: the shortcut to "is this extension actually the problem?" is to profile, disable the suspect, restart the extension host, and profile again.

## The live HUD

```
⚡ 12ms ▂▃▂▁▂▃▅
```

A status bar item, refreshed every 500ms (`blameTheExtension.hud.updateMs`):

- **Lag** — how late a 100ms timer in the extension host actually fires. This is the
  closest thing to an FPS counter for the editor: 0–15ms is smooth, 40ms is noticeable,
  100ms+ is the "why is my typing lagging" feeling.
- **Sparkline** — the last ten readings, so a spike is visible instead of forgotten.
- **Colour** — grey/normal, amber above 40ms, red above 100ms or 80% CPU.
- **Tooltip** — p95 lag, max lag, host CPU, and a count of stutters over 100ms for the
  current session. That count is the honest summary: "your editor froze 4 times in the
  last hour".

It is off by default and costs you nothing until you start it. Click the readout to jump
straight to a full ranked profile.

## What the numbers mean

| Column | Meaning |
|---|---|
| **Host busy** | Share of the sample window the extension host spent executing JavaScript. |
| **CPU** | Share of *wall-clock time* that extension burned one core, e.g. `3.4% CPU` over a 10s window. |
| **Startup** | Milliseconds spent activating that extension at startup, taken from VS Code's own log. When VS Code does not log an explicit `activationTime`, this is the gap between consecutive activation lines, which is a good proxy because activations are sequential. |
| **eager** | The extension activates during startup (`startup: true`) instead of waiting for a trigger. Eager extensions are the ones that cost you on every window open. |
| **built-in** | Ships with VS Code (TypeScript language service, Git, Emmet…). These are usually the biggest consumers, and they can still be disabled. |
| **Score** | `65% CPU share + 35% startup`, normalised against the worst performer. 70+ = disable it, 40–69 = watch it, under 40 = probably fine. |

If everything reads `no CPU samples`, the extension host was idle while you sampled —
which is a real answer too, just not a useful one. Keep typing during the profile, or
use the live HUD and catch it in the act.

## Privacy

There is none to worry about. The extension:

- never opens a network connection,
- never sends telemetry,
- reads only local VS Code logs and the in-process profiler,
- keeps everything in memory unless *you* export it.

## Limitations (read this before opening an issue)

- CPU is attributed to the **extension host process**. That is where ~all extension code runs, but a very heavy extension may spawn child processes that this does not see.
- Built-in extensions are shown by default because the TypeScript language service is
  usually the top consumer. Turn off `blameTheExtension.showBuiltInExtensions` to rank
  only your own installs.
- Remote / WSL / Codespaces: profiling measures the extension host where the extension is running. Log discovery looks in the usual local, remote and server paths.
- If another debugger is attached to the extension host, the inspector may refuse to attach and you will get a clear error instead of fake numbers.

## Why this exists

VS Code ships an Extension Bisect command, but it is a 10-step interactive questionnaire. This is the ranked answer up front.

## Development

```bash
npm install
npm run compile
npm run icon                                  # regenerates media/icon.png
node scripts/test-attribution.js              # URL -> extension mapping
node scripts/test-webview.js                  # CSP nonce + inline script parse
npx @vscode/vsce package                      # build the .vsix
```

Press `F5` in VS Code to launch an Extension Development Host.

## License

MIT
