# Launch plan (the part that makes it famous)

Shipping is 20% of the work. The ranked-list screenshot is the product.

## Before you press publish

1. **Record the GIF.** Install the `.vsix`, start the live HUD, and record 8 seconds of
   the readout spiking **while you type fast**. That is the screenshot no other
   extension can produce, and it is the entire pitch in one loop. Then a second shot of
   the ranked list expanding into hot functions.
   Save as `media/screenshot.gif` (Marketplace renders GIFs — an animated one
   outperforms a static shot 3–5x).
2. **Make the first line of the README the hook.** It currently is:
   *"Find the extension that is slowing down your VS Code."* Do not bury it.
3. **Verify the publisher** (DNS TXT). The badge changes how the listing reads.
4. **Seed 5 real reviews.** Ask five people who actually run heavy setups to
   install and leave an honest rating. Rating count is a ranking input.

## Launch day — in this order

**1. Reddit `r/vscode`** — the single highest-value post. Title format that works:

> I built an FPS counter for VS Code, because "my editor feels slow" is not a useful sentence

Body: one paragraph of pain, the GIF of the HUD spiking **while typing**, the ranked
list as the payoff, a link, and a line asking people to paste their own stutter count.
*Replying to every comment with their profile read back to them is what turns a post
into 1k installs.*

**2. Hacker News `Show HN`** — same day, 3–4 hours later.

> Show HN: Blame the Extension – an FPS counter and CPU profiler for VS Code

First comment should explain the mechanism honestly: in-process Node inspector,
samples mapped to extension folders, startup deltas from `exthost.log`, event-loop
drift as the "FPS". HN respects "here is exactly how it works and here is where it is wrong".

**3. X/Twitter** — a thread, not a link drop. Hook tweet = the live number:

> ⚡ 12ms ▂▃▂▁▂▃▅
>
> That's my VS Code, live, in the status bar. When it goes red I know the editor is about to stutter — and one click tells me which extension did it.

**4. The framework Discords** you are already in. No marketing voice — "made this,
thought it might save you the manual bisect, tell me what it says about your setup".

**5. dev.to / Hashnode** — *"How I attribute CPU time to individual VS Code extensions"*.
Technical deep dive. This post keeps sending installs for years because it ranks
for the `inspector` / `Profiler.start` keywords.

## Week one

- Reply to every issue within 24h. A "fixed in 0.1.1" within a day is the
  single strongest signal a new listing can send.
- Ship `0.1.1` within 7 days with whatever the top complaint is. The "Recently
  updated" filter is real traffic.
- Add the extension to `awesome-vscode` style lists via PR (read their rules first).
- Post one profile screenshot per week from a different famous setup
  ("here's what 40 extensions look like"). Repeatable content, zero effort.

## Seed the comparison posts

These get shared without you:

- "Blame the Extension vs Extension Bisect"
- "What 50 popular extensions actually cost" (your own benchmark table)
- "The 5 most expensive VS Code extensions in 2026" — controversial, high CTR,
  and you can defend it with methodology.

## What not to do

- Do not buy installs or reviews. Delisting is permanent.
- Do not keyword-stuff the display name (`Blame the Extension - Profiler - Slow
  VS Code Fix`). It reads as spam and Microsoft removes it.
- Do not launch on a weekend. Tuesday–Thursday, 9–11am US Eastern.
- Do not argue in the comments about a bad review. Fix it, then reply once.

## The metrics that matter

| Signal | Target after 30 days |
|---|---|
| Installs | 1,000 (top few % of all extensions) |
| Ratings | 15+ at 4.5★ or better |
| Uninstall rate | under 30% |
| Issues opened | 5+ (means people care enough to report) |

If installs stall under 200 after a real launch, the problem is the listing
(screenshot, first line, name) — not the code.
