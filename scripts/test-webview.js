// Static smoke test for the generated webview document.
// Verifies: CSP nonce matches the inline tags, and the inline script parses.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { getHtml } = require("../out/webview.js");

const html = getHtml();

const cspNonce = /script-src 'nonce-([A-Za-z0-9]+)'/.exec(html);
if (!cspNonce) {
  throw new Error("CSP nonce missing");
}
const nonce = cspNonce[1];

for (const tag of ["script", "style"]) {
  const re = new RegExp("<" + tag + " nonce=\"([A-Za-z0-9]+)\">", "g");
  const matches = [...html.matchAll(re)];
  if (matches.length === 0) {
    throw new Error("no inline <" + tag + "> found");
  }
  for (const m of matches) {
    if (m[1] !== nonce) {
      throw new Error("<" + tag + "> nonce does not match the CSP nonce");
    }
  }
}

if (/https?:\/\/(?!raw\.githubusercontent)/.test(html.replace(/<!--[\s\S]*?-->/g, ""))) {
  throw new Error("webview references an external URL (CSP would block it)");
}

const script = /<script nonce="[A-Za-z0-9]+">([\s\S]*?)<\/script>/.exec(html);
if (!script) {
  throw new Error("inline script not found");
}

const tmp = path.join(os.tmpdir(), "bte-webview-script-" + process.pid + ".js");
fs.writeFileSync(tmp, script[1]);
try {
  execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
} finally {
  fs.unlinkSync(tmp);
}

console.log("webview: nonce OK, script parses, no external URLs (" + html.length + " bytes)");
