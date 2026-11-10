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
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: var(--card);
  }
  .row:hover { border-color: var(--line); }
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
    <button id="run" class="primary">Run profile</button>
    <button id="scan">Re-scan logs</button>
  </div>

  <div id="status" class="status">No profile yet. Hit "Run profile" and keep using VS Code while it samples.</div>

  <section id="overview" class="overview hidden">
    <div class="card"><span class="k">CPU in extensions</span><span class="v" id="stat-ext">—</span></div>
    <div class="card"><span class="k">VS Code core</span><span class="v" id="stat-core">—</span></div>
    <div class="card"><span class="k">Lag p95</span><span class="v" id="stat-lag">—</span></div>
    <div class="card"><span class="k">Startup</span><span class="v" id="stat-start">—</span></div>
  </section>

  <div id="warnings"></div>
  <div id="empty" class="empty hidden">No data yet.</div>
  <section id="list" class="list"></section>
  <div id="more" class="more hidden">
    <button id="showAll">Show all</button>
  </div>

  <section id="share" class="share hidden">
    <div id="share-text" class="share-text"></div>
    <div class="controls">
      <button id="copy">Copy report</button>
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

  function fmtMs(v) {
    if (v === null || v === undefined) { return '—'; }
    if (v >= 1000) { return (v / 1000).toFixed(2) + 's'; }
    return Math.round(v) + 'ms';
  }

  function rowElement(row, index, maxCpu) {
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
    bits.push(fmtPct(row.cpuShare) + ' CPU');
    if (row.activationMs !== null) { bits.push(fmtMs(row.activationMs) + ' startup'); }
    if (row.eager) { bits.push('eager'); }
    if (row.topFunction) { bits.push('hot: ' + row.topFunction); }
    main.appendChild(el('div', 'meta', bits.join(' · ')));
    wrap.appendChild(main);

    wrap.appendChild(el('div', 'score', String(row.score)));

    var open = el('button', 'open', 'Open');
    open.addEventListener('click', function () {
      vscode.postMessage({ type: 'open', id: row.ext.id });
    });
    wrap.appendChild(open);

    return wrap;
  }

  function render() {
    var list = $('list');
    list.textContent = '';
    $('warnings').textContent = '';

    if (!report) {
      $('empty').classList.remove('hidden');
      return;
    }
    $('empty').classList.add('hidden');

    var extCpu = 1 - report.coreShare;
    $('stat-ext').textContent = fmtPct(extCpu);
    $('stat-core').textContent = fmtPct(report.coreShare);
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
      'Extension CPU ' + fmtPct(extCpu) + ' · core ' + fmtPct(report.coreShare) +
      (report.lag ? ' · lag p95 ' + Math.round(report.lag.p95) + 'ms' : '') + '\\n' +
      'Top: ' + (rows[0] ? rows[0].ext.id + ' (' + rows[0].score + ')' : 'none');

    $('footer').textContent =
      'Generated ' + new Date(report.generatedAt).toLocaleString() +
      ' · extension host PID ' + report.extensionHostPid +
      (report.logFile ? ' · log ' + report.logFile : '');
  }

  function setRunning(value) {
    $('run').disabled = value;
    $('scan').disabled = value;
    if (value) {
      setStatus('Sampling… keep using VS Code normally (typing, saving, switching files).', 'live');
    }
  }

  $('run').addEventListener('click', function () { vscode.postMessage({ type: 'run' }); });
  $('scan').addEventListener('click', function () { vscode.postMessage({ type: 'scan' }); });
  $('copy').addEventListener('click', function () { vscode.postMessage({ type: 'copy' }); });
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
