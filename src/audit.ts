/**
 * Extension audit — finds overlap and conflicts between installed extensions.
 *
 * Pure logic, no `vscode` import, so it can be unit tested with fixtures.
 * Everything here is derived from `package.json` contributions, which is the
 * only reliable source of truth for what an extension actually installs.
 */

import type { AuditFinding } from "./types";

export interface AuditContributes {
  keybindings?: { key?: string; when?: string; command?: string }[];
  themes?: unknown[];
  iconThemes?: unknown[];
  productIconThemes?: unknown[];
  localizations?: { languageId?: string }[];
  languages?: { id?: string }[];
  debuggers?: { type?: string }[];
}

export interface AuditInput {
  id: string;
  isBuiltin: boolean;
  contributes: AuditContributes;
}

const MAX_FINDINGS = 8;
const MAX_LISTED = 4;

function list(ids: string[]): string {
  const unique = [...new Set(ids)];
  const shown = unique.slice(0, MAX_LISTED);
  const suffix = unique.length > shown.length ? ` +${unique.length - shown.length} more` : "";
  return shown.join(", ") + suffix;
}

/** Groups values and keeps only the groups with more than one member. */
function duplicates<T>(items: T[], key: (item: T) => string | null): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) {
      continue;
    }
    const bucket = groups.get(k);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(k, [item]);
    }
  }
  for (const [k, bucket] of groups) {
    if (bucket.length < 2) {
      groups.delete(k);
    }
  }
  return groups;
}

const SEVERITY_ORDER: Record<AuditFinding["severity"], number> = { high: 0, medium: 1, low: 2 };

export function auditExtensions(items: AuditInput[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // 1. Keybinding collisions. Same key + same `when` = one of them never fires.
  const bindingOwners = items.flatMap((item) =>
    (item.contributes.keybindings ?? [])
      .filter((binding) => typeof binding.key === "string" && binding.key.length > 0)
      .map((binding) => ({
        id: item.id,
        isBuiltin: item.isBuiltin,
        key: String(binding.key).toLowerCase(),
        when: binding.when ?? "",
        command: binding.command ?? ""
      }))
  );

  for (const [signature, group] of duplicates(bindingOwners, (b) => `${b.key}|${b.when}`)) {
    if (group.every((b) => b.isBuiltin)) {
      continue;
    }
    const [key, when] = signature.split("|");
    findings.push({
      title: `${key} is bound ${group.length} times`,
      detail: when ? `All with the condition \`${when}\`.` : "All unconditionally, so only one command runs.",
      extensions: [...new Set(group.map((b) => b.id))],
      severity: "high"
    });
  }

  // 2. Two language packs for the same locale.
  const packs = items.flatMap((item) =>
    (item.contributes.localizations ?? [])
      .filter((localization) => typeof localization.languageId === "string")
      .map((localization) => ({ id: item.id, locale: String(localization.languageId) }))
  );
  for (const [locale, group] of duplicates(packs, (p) => p.locale)) {
    findings.push({
      title: `Two language packs for "${locale}"`,
      detail: "Only one can win at runtime; the other is dead weight.",
      extensions: group.map((g) => g.id),
      severity: "medium"
    });
  }

  // 3. Two user extensions claiming the same language id.
  const languages = items
    .filter((item) => !item.isBuiltin)
    .flatMap((item) => (item.contributes.languages ?? []).map((language) => ({ id: item.id, lang: String(language.id ?? "") })));
  for (const [lang, group] of duplicates(languages, (l) => l.lang)) {
    findings.push({
      title: `Two extensions own the "${lang}" language`,
      detail: "Feature sets get merged, which makes hover, completion and diagnostics unpredictable.",
      extensions: group.map((g) => g.id),
      severity: "medium"
    });
  }

  // 4. Debugger type collisions.
  const debuggers = items
    .filter((item) => !item.isBuiltin)
    .flatMap((item) =>
      (item.contributes.debuggers ?? []).map((debugger_) => ({ id: item.id, type: String(debugger_.type ?? "") }))
    );
  for (const [type, group] of duplicates(debuggers, (d) => d.type)) {
    findings.push({
      title: `Two debuggers for type "${type}"`,
      detail: "Launch configurations may resolve to the wrong debug adapter.",
      extensions: group.map((g) => g.id),
      severity: "medium"
    });
  }

  // 5. Theme hoarding — cheap to fix, easy to demo.
  const themes = items.filter((item) => (item.contributes.themes ?? []).length > 0);
  if (themes.length > 2) {
    findings.push({
      title: `${themes.length} colour themes installed`,
      detail: "Themes are cheap when inactive, but they are the easiest thing to trim.",
      extensions: themes.map((t) => t.id),
      severity: "low"
    });
  }

  const iconThemes = items.filter((item) => (item.contributes.iconThemes ?? []).length > 0);
  if (iconThemes.length > 1) {
    findings.push({
      title: `${iconThemes.length} icon themes installed`,
      detail: "Only one is active at a time; the rest are dead weight.",
      extensions: iconThemes.map((t) => t.id),
      severity: "low"
    });
  }

  return findings
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, MAX_FINDINGS)
    .map((finding) => ({ ...finding, detail: `${finding.detail} (${list(finding.extensions)})` }));
}
