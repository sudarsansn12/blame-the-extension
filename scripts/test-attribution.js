// Plain-Node sanity check for the URL -> extension attribution logic.
// Run with: node scripts/test-attribution.js   (after `npm run compile`)

const assert = require("assert");
const { attribute, buildAttribution, urlToPath } = require("../out/attribute.js");

const extensions = [
  { id: "sst-dev.opencode", extensionPath: "C:\\Users\\me\\.vscode\\extensions\\sst-dev.opencode-1.0.0" },
  { id: "ms-python.python", extensionPath: "C:\\Users\\me\\.vscode\\extensions\\ms-python.python-2024.1.0" },
  { id: "vscode.git", extensionPath: "C:\\Program Files\\Microsoft VS Code\\resources\\app\\extensions\\git" }
];
const attribution = buildAttribution(extensions);

assert.strictEqual(
  urlToPath("file:///c%3A/Users/me/.vscode/extensions/sst-dev.opencode-1.0.0/dist/extension.js"),
  "c:/users/me/.vscode/extensions/sst-dev.opencode-1.0.0/dist/extension.js"
);
assert.strictEqual(urlToPath("file:///home/me/ext/a.js"), "/home/me/ext/a.js");

assert.strictEqual(
  attribute("file:///c%3A/Users/me/.vscode/extensions/ms-python.python-2024.1.0/out/client/extension.js", attribution),
  "ms-python.python"
);
assert.strictEqual(
  attribute("file:///c%3A/Users/me/.vscode/extensions/ms-python.python-2024.1.0/node_modules/foo/index.js", attribution),
  "ms-python.python"
);
assert.strictEqual(
  attribute("file:///c%3A/Program%20Files/Microsoft%20VS%20Code/resources/app/extensions/git/dist/main.js", attribution),
  "vscode.git"
);
assert.strictEqual(
  attribute("file:///c%3A/Program%20Files/Microsoft%20VS%20Code/resources/app/out/vs/workbench/api/node/extensionHostProcess.js", attribution),
  null
);
assert.strictEqual(attribute("node:internal/timers", attribution), null);
assert.strictEqual(attribute("(native)", attribution), null);

console.log("attribution: all checks passed");
