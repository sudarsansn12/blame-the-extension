/**
 * The sidebar UI. Rendered as a single self-contained document: no assets, no
 * network requests, everything inline with a per-load nonce.
 */

function nonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function getHtml(): string {
  const n = nonce();
  const csp = [
    "default-src 'none'",
    `style-src 'nonce-${n}'`,
    `script-src 'nonce-${n}'`,
    "img-src data: https:"
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blame the Extension</title>
<style nonce="${n}">
  :root {
    --bg: var(--vscode-sideBar-background, #0d1117);
    --fg: var(--vscode-foreground, #c9d1d9);
    --muted: var(--vscode-descriptionForeground, #8b949e);
    --line: var(--vscode-panel-border, rgba(255,255,255,0.08));
    --accent: var(--vscode-button-background, #238636);
    --accent-fg: var(--vscode-button-foreground, #ffffff);
    --blame: #f85149;
    --watch: #d29922;
    --fine: #3fb950;
    --card: var(--vscode-editorWidget-background, rgba(255,255,255,0.03));
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 14px 14px 24px;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--vscode-font-family, -apple-system, "Segoe UI", sans-serif);
    font-size: 12px;
    line-height: 1.45;
  }
  h1 { font-size: 15px; margin: 0 0 2px; letter-spacing: -0.01em; }
  .tagline { margin: 0 0 12px; color: var(--muted); font-size: 11.5px; }
  .controls { display: flex; gap: 6px; flex-wrap: wrap; }
  button {
    font-family: inherit;
    font-size: 11.5px;
    border-radius: 5px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--fg);
    padding: 6px 10px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
  }
  button:hover { border-color: var(--muted); }
  button:disabled { opacity: 0.45; cursor: default; }
  button.primary {
    background: var(--accent);
    border-color: transparent;
    color: var(--accent-fg);
    font-weight: 600;
  }
  button.primary:hover { filter: brightness(1.1); }
  .status { margin: 10px 0 0; font-size: 11.5px; color: var(--muted); min-height: 16px; }
  .status.error { color: var(--blame); }
  .status.live { color: var(--watch); }
  .overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 12px 0;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .card .k { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .card .v { font-size: 17px; font-weight: 650; font-variant-numeric: tabular-nums; }
  .warn {
    border-left: 2px solid var(--watch);
    padding: 4px 8px;
    margin: 6px 0;
    color: var(--muted);
    font-size: 11px;
    background: var(--card);
  }
  .list { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
  .entry {
    background: var(--card);
    border: 1px solid transparent;
    border-radius: 6px;
  }
  .entry:hover { border-color: var(--line); }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    cursor: pointer;
  }
  .details {
    display: none;
    flex-direction: column;
    gap: 3px;
    padding: 0 8px 8px 30px;
  }
  .entry.open .details { display: flex; }
  .detail {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 10.5px;
    color: var(--muted);
  }
  .detail .fn {
    color: var(--fg);
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail .file { font-size: 10px; white-space: nowrap; }
  .detail .num { margin-left: auto; font-variant-numeric: tabular-nums; }
  .rank { width: 14px; text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; font-size: 10.5px; }
  .main { flex: 1; min-width: 0; }
  .title { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .ext {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ver { color: var(--muted); font-size: 10px; flex-shrink: 0; }
  .bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.07); margin: 5px 0 3px; overflow: hidden; }
  .bar i { display: block; height: 100%; border-radius: 2px; background: var(--muted); }
  .row.blame .bar i { background: var(--blame); }
  .row.watch .bar i { background: var(--watch); }
  .row.fine .bar i { background: var(--fine); }
  .meta { color: var(--muted); font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .score {
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 26px;
    text-align: right;
  }
  .row.blame .score { color: var(--blame); }
  .row.watch .score { color: var(--watch); }
  .row.fine .score { color: var(--fine); }
  .row.idle .score { color: var(--muted); }
  .open {
    opacity: 0;
    padding: 3px 7px;
    font-size: 10px;
  }
  .row:hover .open { opacity: 1; }
  .more { margin-top: 6px; }
  .sec { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 10px; }
  .sec h2 {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0 0 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pill {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    padding: 0 6px;
    font-size: 10px;
    color: var(--fg);
    font-weight: 500;
  }
  .reg { border-radius: 6px; padding: 8px 10px; margin: 10px 0 0; font-size: 11px; border: 1px solid var(--line); }
  .reg.worse { border-color: var(--blame); background: rgba(248, 81, 73, 0.08); }
  .reg.better { border-color: var(--fine); background: rgba(63, 185, 80, 0.08); }
  .reg.same { color: var(--muted); }
  .wf { display: flex; height: 14px; border-radius: 4px; overflow: hidden; background: rgba(255, 255, 255, 0.06); }
  .wf i { display: block; height: 100%; }
  .wf i.eager { background: var(--watch); }
  .wf i.lazy { background: #3d5a80; }
  .wf i.boot { background: #2b3648; }
  .legend { display: flex; flex-wrap: wrap; gap: 2px 10px; margin-top: 6px; font-size: 10px; color: var(--muted); }
  .legend span { white-space: nowrap; }
  .lat { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11px; }
  .lat .name { width: 104px; flex-shrink: 0; color: var(--muted); }
  .lat .track { flex: 1; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
  .lat .track i { display: block; height: 100%; background: var(--muted); }
  .lat.bad .track i { background: var(--blame); }
  .lat .v { width: 58px; text-align: right; font-variant-numeric: tabular-nums; }
  .li { padding: 5px 0; border-bottom: 1px solid var(--line); font-size: 11px; }
  .li:last-child { border-bottom: none; }
  .li .t { font-weight: 600; display: flex; align-items: baseline; gap: 6px; }
  .li .d { color: var(--muted); font-size: 10.5px; }
  .dot { width: 6px; height: 6px; border-radius: 3px; display: inline-block; flex-shrink: 0; }
  .dot.high { background: var(--blame); }
  .dot.medium { background: var(--watch); }
  .dot.low { background: var(--muted); }
  .kv { display: grid; grid-template-columns: 1fr auto; gap: 3px 8px; font-size: 11px; }
  .kv .k { color: var(--muted); }
  .kv .v { font-variant-numeric: tabular-nums; text-align: right; }
  .mono { font-family: var(--vscode-editor-font-family, monospace); }
  .share { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 12px; }
  .share-text {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10.5px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .footer { margin-top: 14px; color: var(--muted); font-size: 10px; word-break: break-all; }
  .hidden { display: none !important; }
  .empty { color: var(--muted); padding: 18px 4px; text-align: center; }
</style>
</head>
<body>
  <h1>Blame the Extension</h1>
  <p class="tagline">Find the extension eating your CPU.</p>

  <div class="controls">
    <button id="hud" class="primary">Start live HUD</button>
    <button id="run">Run profile</button>
    <button id="scan">Re-scan logs</button>
  </div>

  <div id="status" class="status">Start the live HUD to watch lag in the status bar while you work, or run a profile for a ranked list.</div>

  <section id="overview" class="overview hidden">
    <div class="card"><span class="k">Host busy</span><span class="v" id="stat-busy">—</span></div>
    <div class="card"><span class="k">In extensions</span><span class="v" id="stat-ext">—</span></div>
    <div class="card"><span class="k">Lag p95</span><span class="v" id="stat-lag">—</span></div>
    <div class="card"><span class="k">Startup</span><span class="v" id="stat-start">—</span></div>
  </section>

  <div id="warnings"></div>
  <div id="empty" class="empty hidden">No data yet.</div>
  <section id="list" class="list"></section>
  <div id="more" class="more hidden">
    <button id="showAll">Show all</button>
  </div>

  <div id="regression" class="reg hidden"></div>

  <section id="latency" class="sec hidden">
    <h2>Action latency</h2>
    <div id="latency-body"></div>
    <div id="latency-note" class="legend"></div>
  </section>

  <section id="waterfall" class="sec hidden">
    <h2>Startup waterfall</h2>
    <div id="wf" class="wf"></div>
    <div id="wf-legend" class="legend"></div>
  </section>

  <section id="stutters" class="sec hidden">
    <h2>Stutters <span id="stutter-count" class="pill"></span></h2>
    <div id="stutter-list"></div>
  </section>

  <section id="audit" class="sec hidden">
    <h2>Audit</h2>
    <div id="audit-list"></div>
  </section>

  <section id="background" class="sec hidden">
    <h2>While you were away</h2>
    <div id="bg-list"></div>
  </section>

  <section id="session" class="sec hidden">
    <h2>Session</h2>
    <div id="session-body" class="kv"></div>
  </section>

  <section id="share" class="share hidden">
    <div id="share-text" class="share-text"></div>
    <div class="controls">
      <button id="copy">Copy report</button>
      <button id="copySession">Copy session</button>
      <button id="copyShare">Copy share line</button>
      <button id="export">Export JSON</button>
    </div>
  </section>

  <div id="footer" class="footer"></div>

<script nonce="${n}">
(function () {
  var vscode = acquireVsCodeApi();
  var report = null;
  var expanded = false;
  var COLLAPSED = 12;

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function setStatus(text, cls) {
    var s = $('status');
    s.textContent = text;
    s.className = 'status' + (cls ? ' ' + cls : '');
  }

  function fmtPct(v) { return (v * 100).toFixed(1) + '%'; }

  function fmtCpu(v) {
    if (!v || v <= 0) { return 'no CPU samples'; }
    if (v < 0.1) { return '<0.1% CPU'; }
    return v.toFixed(1) + '% CPU';
  }

  function fmtMs(v) {
    if (v === null || v === undefined) { return '—'; }
    if (v >= 1000) { return (v / 1000).toFixed(2) + 's'; }
    return Math.round(v) + 'ms';
  }

  function rowElement(row, index, maxCpu) {
    var entry = el('div', 'entry');
    var wrap = el('div', 'row ' + row.verdict);

    wrap.appendChild(el('div', 'rank', String(index + 1)));

    var main = el('div', 'main');
    var title = el('div', 'title');
    title.appendChild(el('span', 'ext', row.ext.id));
    if (row.ext.version) { title.appendChild(el('span', 'ver', 'v' + row.ext.version)); }
    main.appendChild(title);

    var bar = el('div', 'bar');
    var fill = el('i');
    var pctWidth = maxCpu > 0 ? Math.max(2, (row.cpuShare / maxCpu) * 100) : 0;
    fill.style.width = pctWidth.toFixed(1) + '%';
    bar.appendChild(fill);
    main.appendChild(bar);

    var bits = [];
    bits.push(fmtCpu(row.cpuPct));
    if (row.activationMs !== null) { bits.push(fmtMs(row.activationMs) + ' startup'); }
    if (row.eager) { bits.push('eager'); }
    if (row.ext.isBuiltin) { bits.push('built-in'); }
    if (row.topFunctions && row.topFunctions.length > 0) {
      bits.push('hot: ' + row.topFunctions[0].name);
    }
    main.appendChild(el('div', 'meta', bits.join(' · ')));
    wrap.appendChild(main);

    wrap.appendChild(el('div', 'score', String(row.score)));

    var open = el('button', 'open', 'Open');
    open.addEventListener('click', function () {
      vscode.postMessage({ type: 'open', id: row.ext.id });
    });
    wrap.appendChild(open);

    entry.appendChild(wrap);

    var funcs = row.topFunctions || [];
    if (funcs.length > 0) {
      var details = el('div', 'details');
      funcs.forEach(function (fn) {
        var line = el('div', 'detail');
        line.appendChild(el('span', 'fn', fn.name || '(anonymous)'));
        if (fn.file) {
          line.appendChild(el('span', 'file', fn.file));
        }
        line.appendChild(el('span', 'num', Math.round(fn.share * 100) + '%'));
        details.appendChild(line);
      });
      entry.appendChild(details);

      wrap.addEventListener('click', function (event) {
        if (event.target && event.target.className === 'open') {
          return;
        }
        entry.classList.toggle('open');
      });
    }

    return entry;
  }

  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

  function show(id, visible) { $(id).classList.toggle('hidden', !visible); }

  function fmtClock(epoch) {
    var d = new Date(epoch);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function renderRegression(reg) {
    var box = $('regression');
    if (!reg) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.className = 'reg ' + reg.verdict;
    var parts = [];
    parts.push('lag p95 ' + Math.round(reg.lagP95.from) + '→' + Math.round(reg.lagP95.to) + 'ms');
    parts.push('busy ' + Math.round(reg.hostBusy.from * 100) + '→' + Math.round(reg.hostBusy.to * 100) + '%');
    if (reg.startupMs.from !== null && reg.startupMs.to !== null) {
      parts.push('startup ' + Math.round(reg.startupMs.from) + '→' + Math.round(reg.startupMs.to) + 'ms');
    }
    var label = reg.verdict === 'worse' ? 'Worse' : reg.verdict === 'better' ? 'Better' : 'Unchanged';
    box.textContent = label + ' vs previous profile · ' + parts.join(' · ');
  }

  function renderLatency(lat) {
    var body = $('latency-body');
    var note = $('latency-note');
    clear(body);
    clear(note);
    if (!lat || !lat.actions || lat.actions.length === 0) { show('latency', false); return; }
    show('latency', true);
    var max = 0;
    lat.actions.forEach(function (a) { if (a.medianMs && a.medianMs > max) { max = a.medianMs; } });
    lat.actions.forEach(function (a) {
      var row = el('div', 'lat' + (a.ok && a.medianMs > 300 ? ' bad' : ''));
      row.appendChild(el('div', 'name', a.label));
      var track = el('div', 'track');
      var fill = el('i');
      fill.style.width = max > 0 && a.medianMs ? Math.max(2, (a.medianMs / max) * 100).toFixed(1) + '%' : '0%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('div', 'v', a.ok ? Math.round(a.medianMs) + 'ms' : '—'));
      body.appendChild(row);
      if (!a.ok && a.note) { note.appendChild(el('span', null, a.label + ': ' + a.note)); }
    });
    if (lat.topExtension) {
      note.appendChild(el('span', null, 'CPU during benchmark: ' + lat.topExtension.id + ' (' + Math.round(lat.topExtension.share * 100) + '%)'));
    } else if (!lat.attributed) {
      note.appendChild(el('span', null, 'No extension CPU was attributed during the benchmark.'));
    }
  }

  function renderWaterfall(timeline) {
    var bar = $('wf');
    var legend = $('wf-legend');
    clear(bar);
    clear(legend);
    if (!timeline || timeline.length === 0) { show('waterfall', false); return; }
    var total = 0;
    timeline.forEach(function (s) { total += s.durationMs; });
    if (total <= 0) { show('waterfall', false); return; }
    show('waterfall', true);
    timeline.forEach(function (s) {
      var seg = el('i', s.id === 'boot' ? 'boot' : s.eager ? 'eager' : 'lazy');
      seg.style.width = ((s.durationMs / total) * 100).toFixed(2) + '%';
      seg.title = s.label + ' · ' + Math.round(s.durationMs) + 'ms';
      bar.appendChild(seg);
    });
    timeline.slice().sort(function (a, b) { return b.durationMs - a.durationMs; }).slice(0, 6)
      .forEach(function (s) {
        legend.appendChild(el('span', null, s.label + ' ' + Math.round(s.durationMs) + 'ms'));
      });
  }

  function renderStutters(events, session) {
    var list = $('stutter-list');
    clear(list);
    if (!events || events.length === 0) { show('stutters', false); return; }
    show('stutters', true);
    $('stutter-count').textContent = session ? String(session.stutters) : String(events.length);
    events.forEach(function (ev) {
      var row = el('div', 'li');
      var title = el('div', 't');
      title.appendChild(el('span', null, fmtClock(ev.at)));
      title.appendChild(el('span', null, Math.round(ev.lagMs) + 'ms'));
      if (ev.cpuPct >= 0.1) { title.appendChild(el('span', null, Math.round(ev.cpuPct) + '% cpu')); }
      row.appendChild(title);
      var bits = [];
      if (ev.file) { bits.push(ev.file); }
      if (ev.extension) { bits.push(ev.extension); }
      if (bits.length) { row.appendChild(el('div', 'd', bits.join(' · '))); }
      list.appendChild(row);
    });
  }

  function renderAudit(findings) {
    var list = $('audit-list');
    clear(list);
    if (!findings || findings.length === 0) { show('audit', false); return; }
    show('audit', true);
    findings.forEach(function (f) {
      var row = el('div', 'li');
      var title = el('div', 't');
      title.appendChild(el('span', 'dot ' + f.severity));
      title.appendChild(el('span', null, f.title));
      row.appendChild(title);
      row.appendChild(el('div', 'd', f.detail));
      list.appendChild(row);
    });
  }

  function renderBackground(sessions, session) {
    var list = $('bg-list');
    clear(list);
    if (!sessions || sessions.length === 0) { show('background', false); return; }
    show('background', true);
    if (session && session.backgroundCpuPct !== null && session.backgroundCpuPct !== undefined) {
      list.appendChild(el('div', 'd', 'Average ' + session.backgroundCpuPct + '% of a core while unfocused.'));
    }
    sessions.forEach(function (s) {
      var row = el('div', 'li');
      row.appendChild(el('div', 't', Math.round(s.wallSeconds / 60) + 'm away · ' + s.avgPct + '% avg'));
      row.appendChild(el('div', 'd', s.cpuSeconds + 's of CPU · ended ' + fmtClock(s.end)));
      list.appendChild(row);
    });
  }

  function renderSession(session) {
    var body = $('session-body');
    clear(body);
    if (!session) { show('session', false); return; }
    show('session', true);
    function kv(k, v) {
      body.appendChild(el('div', 'k', k));
      body.appendChild(el('div', 'v', v));
    }
    var mins = Math.floor(session.uptimeSeconds / 60);
    var secs = session.uptimeSeconds % 60;
    kv('Session', mins + 'm ' + secs + 's');
    kv('Stutters > 100ms', String(session.stutters));
    kv('Worst freeze', session.worstLagMs + 'ms');
    kv('Time blocked', (session.lossMs / 1000).toFixed(1) + 's');
    if (session.backgroundCpuPct !== null && session.backgroundCpuPct !== undefined) {
      kv('While unfocused', session.backgroundCpuPct + '%');
    }
  }

  function render() {
    var list = $('list');
    list.textContent = '';
    $('warnings').textContent = '';

    if (!report) {
      $('empty').classList.remove('hidden');
      ['latency', 'waterfall', 'stutters', 'audit', 'background', 'session'].forEach(function (id) { show(id, false); });
      $('regression').classList.add('hidden');
      return;
    }
    $('empty').classList.add('hidden');

    var busy = report.hostBusyShare || 0;
    var extCpu = busy * (1 - report.coreShare);
    $('stat-busy').textContent = fmtPct(busy);
    $('stat-ext').textContent = fmtPct(extCpu);
    $('stat-lag').textContent = report.lag ? Math.round(report.lag.p95) + 'ms' : '—';
    $('stat-start').textContent = fmtMs(report.startupTotalMs);
    $('overview').classList.remove('hidden');

    (report.warnings || []).forEach(function (text) {
      $('warnings').appendChild(el('div', 'warn', text));
    });

    var rows = report.rows || [];
    var maxCpu = 0;
    rows.forEach(function (r) { if (r.cpuShare > maxCpu) { maxCpu = r.cpuShare; } });

    var visible = expanded ? rows : rows.slice(0, COLLAPSED);
    visible.forEach(function (row, i) { list.appendChild(rowElement(row, i, maxCpu)); });

    if (rows.length > COLLAPSED) {
      $('more').classList.remove('hidden');
      $('showAll').textContent = expanded ? 'Show top ' + COLLAPSED : 'Show all ' + rows.length;
    } else {
      $('more').classList.add('hidden');
    }

    $('share').classList.remove('hidden');
    $('share-text').textContent =
      'VS Code ' + report.vscodeVersion + ' · ' + report.totalSamples + ' samples over ' +
      Math.round(report.durationMs / 1000) + 's\\n' +
      'Host busy ' + fmtPct(busy) + ' · extensions ' + fmtPct(extCpu) +
      (report.lag ? ' · lag p95 ' + Math.round(report.lag.p95) + 'ms' : '') + '\\n' +
      'Top: ' + (rows[0] ? rows[0].ext.id + ' (' + rows[0].score + ')' : 'none');

    $('footer').textContent =
      'Generated ' + new Date(report.generatedAt).toLocaleString() +
      ' · extension host PID ' + report.extensionHostPid +
      (report.logFile ? ' · log ' + report.logFile : '');

    renderRegression(report.regression);
    renderLatency(report.latency);
    renderWaterfall(report.startupTimeline);
    renderStutters(report.stutters, report.session);
    renderAudit(report.audit);
    renderBackground(report.background, report.session);
    renderSession(report.session);
  }

  function setRunning(value) {
    $('run').disabled = value;
    $('scan').disabled = value;
    if (value) {
      setStatus('Sampling… keep using VS Code normally (typing, saving, switching files).', 'live');
    }
  }

  $('run').addEventListener('click', function () { vscode.postMessage({ type: 'run' }); });
  $('hud').addEventListener('click', function () { vscode.postMessage({ type: 'hud' }); });
  $('scan').addEventListener('click', function () { vscode.postMessage({ type: 'scan' }); });
  $('copy').addEventListener('click', function () { vscode.postMessage({ type: 'copy' }); });
  $('copySession').addEventListener('click', function () { vscode.postMessage({ type: 'copySession' }); });
  $('copyShare').addEventListener('click', function () { vscode.postMessage({ type: 'copyShare' }); });
  $('export').addEventListener('click', function () { vscode.postMessage({ type: 'export' }); });
  $('showAll').addEventListener('click', function () {
    expanded = !expanded;
    render();
  });

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (msg.type === 'report') {
      report = msg.report;
      render();
      setStatus('Done. ' + (report.rows.length) + ' extensions ranked.');
    } else if (msg.type === 'running') {
      setRunning(msg.value);
    } else if (msg.type === 'phase') {
      setStatus(msg.message, 'live');
    } else if (msg.type === 'hudState') {
      $('hud').textContent = msg.value ? 'Stop live HUD' : 'Start live HUD';
      $('hud').className = msg.value ? '' : 'primary';
    } else if (msg.type === 'error') {
      setStatus(msg.message, 'error');
    } else if (msg.type === 'info') {
      setStatus(msg.message, 'live');
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
