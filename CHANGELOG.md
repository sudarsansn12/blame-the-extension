# Changelog

## 0.1.0

- Live CPU attribution per extension via the Node inspector.
- **Live HUD in the status bar**: lag in ms, sparkline, amber/red thresholds, session stutter count.
- Startup cost and eager-activation detection from `exthost.log`.
- Event-loop lag measurement (p50 / p95 / max).
- Composite 0–100 cost score with blame / watch / fine verdicts.
- Per-row expansion showing the five hottest functions inside each extension.
- Sidebar webview with ranked list, Markdown copy and JSON export.
- **Per-action latency**: format, completion, hover and go-to-definition benchmarked with timeouts, plus CPU attribution during the benchmark.
- **Stutter flight recorder**: 250ms heartbeat, every freeze over 100ms kept with time, file and host CPU.
- **Background burn detector**: CPU accumulated while the window is unfocused.
- **Startup waterfall**: proportional timeline of boot plus each activation, eager vs lazy.
- **Extension audit**: keybinding collisions, duplicate language packs, duplicate language ids, conflicting debuggers, theme and icon-theme hoarding.
- **Session report card**: uptime, stutters, worst freeze, time blocked, average background CPU; copyable as Markdown.
- **Baseline & regression**: each profile is compared against the previous one (20% threshold) and shown as a better/worse banner.
- HUD refresh default raised to 1000ms; `hud.style` (`number` / `meter` / `minimal`) added; the HUD is now fixed-width so the status bar never shifts.
