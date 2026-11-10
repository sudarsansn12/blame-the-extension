// Plain-Node checks for the pure logic: audit heuristics and baseline diffs.
// Run with: node scripts/test-logic.js   (after `npm run compile`)

const assert = require("assert");
const { auditExtensions } = require("../out/audit.js");
const { compareBaseline, toBaseline } = require("../out/baseline.js");
const { sessionMarkdown } = require("../out/reportcard.js");

// ---- audit ----
const findings = auditExtensions([
  {
    id: "acme.one",
    isBuiltin: false,
    contributes: {
      keybindings: [{ key: "Ctrl+K", when: "editorTextFocus" }],
      themes: [{}]
    }
  },
  {
    id: "acme.two",
    isBuiltin: false,
    contributes: {
      keybindings: [{ key: "ctrl+k", when: "editorTextFocus" }],
      themes: [{}]
    }
  },
  {
    id: "acme.pack-ja",
    isBuiltin: false,
    contributes: { localizations: [{ languageId: "ja" }], themes: [{}] }
  },
  { id: "acme.pack-ja2", isBuiltin: false, contributes: { localizations: [{ languageId: "ja" }] } },
  { id: "acme.lang-a", isBuiltin: false, contributes: { languages: [{ id: "mylang" }] } },
  { id: "acme.lang-b", isBuiltin: false, contributes: { languages: [{ id: "mylang" }] } }
]);

const byTitle = (needle) => findings.find((f) => f.title.toLowerCase().includes(needle));

assert.ok(byTitle("ctrl+k"), "keybinding collision should be reported");
assert.strictEqual(byTitle("ctrl+k").severity, "high");
assert.ok(byTitle('"ja"'), "duplicate language pack should be reported");
assert.ok(byTitle("mylang"), "duplicate language id should be reported");
assert.ok(byTitle("colour themes"), "theme count should be reported");
assert.ok(findings.every((f) => f.extensions.length > 0), "every finding names extensions");

// One extension alone must produce nothing.
assert.deepStrictEqual(
  auditExtensions([{ id: "only.one", isBuiltin: false, contributes: { themes: [{}] } }]),
  []
);

// ---- baseline ----
const report = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  lag: { p50: 2, p95: 40, max: 90, samples: 100 },
  hostBusyShare: 0.3,
  startupTotalMs: 800,
  rows: [{ ext: { id: "acme.one" }, cpuPct: 5 }]
};

const snapshot = toBaseline(report);
assert.strictEqual(snapshot.lagP95, 40);
assert.strictEqual(snapshot.topExtension, "acme.one");

assert.strictEqual(compareBaseline(null, report), null);
assert.strictEqual(
  compareBaseline(snapshot, { ...report, lag: { p95: 80 } }).verdict,
  "worse"
);
assert.strictEqual(
  compareBaseline(snapshot, { ...report, lag: { p95: 10 } }).verdict,
  "better"
);
assert.strictEqual(compareBaseline(snapshot, { ...report }).verdict, "same");

// ---- session card ----
const card = sessionMarkdown({
  ...report,
  session: {
    startedAt: "2026-01-01T00:00:00.000Z",
    uptimeSeconds: 3600 * 2 + 60 * 14,
    stutters: 7,
    worstLagMs: 840,
    lossMs: 3200,
    backgroundCpuPct: 12
  },
  latency: { actions: [{ label: "Save / format", medianMs: 620, ok: true }], durationMs: 1, samples: 3 },
  rows: [{ ext: { id: "acme.one" }, cpuPct: 5 }]
});
assert.ok(card.includes("2h 14m"), "session duration");
assert.ok(card.includes("7"), "stutter count");
assert.ok(card.includes("Save / format"), "slowest action");

console.log("logic: all checks passed (" + findings.length + " audit findings in fixture)");
