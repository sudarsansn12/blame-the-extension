/**
 * Maps a CPU-profile script URL back to the extension that owns it.
 *
 * Kept dependency-free (no `vscode` import) so it can be unit tested with plain
 * Node, and because getting this wrong silently attributes everything to "core".
 */

import type { ExtInfo } from "./types";

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

/**
 * file:///c%3A/Users/me/ext/x.js  -> c:/users/me/ext/x.js
 * file:///home/me/ext/x.js       -> /home/me/ext/x.js
 */
export function urlToPath(url: string): string {
  let value = url;
  if (value.startsWith("file://")) {
    value = value.slice("file://".length);
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep the raw value */
    }
  }
  // On Windows the decoded path keeps a leading slash before the drive letter.
  value = value.replace(/^\/([a-zA-Z]:\/)/, "$1");
  return normalizePath(value);
}

export interface Attribution {
  /** Longest prefix wins, so nested extensions / node_modules resolve correctly. */
  lookup: { prefix: string; id: string }[];
}

export function buildAttribution(extensions: ExtInfo[]): Attribution {
  return {
    lookup: extensions
      .map((ext) => ({ prefix: normalizePath(ext.extensionPath), id: ext.id }))
      .filter((entry) => entry.prefix.length > 0)
      .sort((a, b) => b.prefix.length - a.prefix.length)
  };
}

/** Returns the owning extension id, or null when the sample belongs to VS Code itself. */
export function attribute(url: string, attribution: Attribution): string | null {
  if (!url || url === "(native)" || url === "(unknown)" || url.startsWith("node:")) {
    return null;
  }
  const path = urlToPath(url);
  if (path.length === 0) {
    return null;
  }
  for (const entry of attribution.lookup) {
    if (path === entry.prefix || path.startsWith(entry.prefix + "/")) {
      return entry.id;
    }
  }
  return null;
}
