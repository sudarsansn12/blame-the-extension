# Publishing — Sudarsan S

Publisher ID: **`sudarsans`** ✅ created
Extension ID will be: **`sudarsans.blame-the-extension`**

> Auth is **Trusted Publishing (GitHub OIDC)** — no Azure DevOps PAT, because creating
> one now requires an Azure subscription. See "Why there is no PAT step" below.

> Both were checked against the Marketplace API before this file was written:
> `blame-the-extension` does not exist, and `marketplace.visualstudio.com/publishers/sudarsans`
> returns 404 (i.e. the ID is free).

Only step 1 needs a browser. Everything else is copy-paste.

---

## 0. Test it first (10 minutes, do not skip)

### A. Fast loop — Extension Development Host

```bash
npm install
npm run compile
code --extensionDevelopmentPath="C:\Users\sudar\Documents\personal_proj"
```

A second VS Code window opens with `[Extension Development Host]` in the title.

1. Click the **bar-chart icon** in the activity bar on the left.
2. Press **Run profile**.
3. **Keep using the window** for 10 seconds — type, save a file, switch tabs.
   An idle editor produces idle samples and a useless report.
4. You should see four stat cards, a ranked list, and a score per extension.

If it fails, open **Help → Toggle Developer Tools → Console**, and
**View → Output → Blame the Extension** for the error.

### B. Real-user test — the packaged `.vsix`

```bash
npx vsce package
code --install-extension blame-the-extension-0.1.0.vsix
```

Reload your normal VS Code window (`Ctrl+Shift+P` → "Reload Window"), run a profile,
then confirm these all work:

- [ ] list is ranked and the top row is coloured red
- [ ] "Copy report" puts Markdown on the clipboard
- [ ] "Export JSON" writes a file and opens a save dialog in a sane folder
- [ ] "Open" on a row jumps to that extension's page
- [ ] "Show all" expands past 12 rows
- [ ] changing `blameTheExtension.sampleSeconds` to 20 changes the sample window
- [ ] no error toast when a second profile is run back to back

Uninstall afterwards if you want: `code --uninstall-extension sudarsans.blame-the-extension`

---

## 1. Create the publisher (once, browser)

1. Sign in at <https://marketplace.visualstudio.com/manage> with a Microsoft account.
   If it asks for an organisation, create one; the name does not matter.
2. **Create publisher**:
   - **ID: `sudarsans`** ← must match `publisher` in `package.json` exactly. This cannot be renamed later.
   - **Name: `Sudarsan S`**
3. Confirm the page loads: <https://marketplace.visualstudio.com/publishers/sudarsans>

Keeping the publisher ID lowercase and hyphen-free avoids a class of sign-in and
URL bugs that people hit with mixed-case IDs.

## 2. Create the GitHub repo and push (once)

`gh` is not installed here. Create the repo at <https://github.com/new>:

- **Name: `blame-the-extension`** ← must match the Trusted Publishing policy in step 3 exactly
- **Public**
- **Do not** add a README, .gitignore or licence. The repo must start empty.

Then:

```bash
git remote add origin https://github.com/sudarsansn12/blame-the-extension.git
git push -u origin main
```

### Why there is no PAT step

Publishing used to require an Azure DevOps Personal Access Token. Creating a PAT
requires an Azure DevOps **organization**, and since 2026 Microsoft requires an
**Azure subscription** to create one — which is why `dev.azure.com` blocks you with
"link it to an Azure subscription… we couldn't find any subscriptions".

You do not need one. Visual Studio Marketplace supports **Trusted Publishing**: a
GitHub Actions workflow proves its identity with OIDC, and the Marketplace trades
that proof for a publishing credential that expires in 15 minutes. No PAT, no Azure
subscription, no stored secret. `.github/workflows/publish.yml` is already configured
for it.

> The Entra ID path (`--azure-credential`) is the other supported option, but it also
> needs Azure resources. Trusted Publishing is the only subscription-free route.

## 3. Create the Trusted Publishing policy (once, browser)

1. Open the publisher at
   <https://marketplace.visualstudio.com/manage/publishers/sudarsans>.
2. Select **Trusted Publishing** → expand **Create**.
3. Fill in exactly:

   | Field | Value |
   |---|---|
   | **Policy name** | `Release workflow` (anything you like) |
   | **Repository owner** | `sudarsansn12` |
   | **Repository** | `blame-the-extension` |
   | **Workflow** | `publish.yml` |
   | **Environment** | leave empty |

4. Select **Create**.

All five values are case-sensitive and the workflow filename must match
`.github/workflows/publish.yml` exactly. A mismatch fails at publish time with an
authorization error, not a helpful message.

## 4. Publish

From the Actions tab, run **Publish** → **Run workflow** (the manual trigger).

Or publish by tag, which is the normal path for releases:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow compiles, runs all three test scripts, then publishes with
`vsce publish --oidc`. Watch it at
<https://github.com/sudarsansn12/blame-the-extension/actions>.

Useful local variants (these can also publish, but they still need *some*
credential, so prefer the workflow):

```bash
npx vsce package                 # build the .vsix without uploading
npx vsce ls                      # exactly which files ship
```

The listing appears after a short automated review. New publishers sometimes wait
longer than established ones — that is normal, not a rejection.

### Subsequent releases

```bash
# 1. bump the version and write the changelog entry
npm pkg set version=0.1.1

# 2. commit and tag — the tag publishes
git add -A && git commit -m "0.1.1"
git tag v0.1.1 && git push origin main --tags
```

Never reuse a tag or a version number. If a publish run fails, fix it and re-run the
workflow from the Actions tab (`workflow_dispatch`) rather than deleting the tag.

### New listings show up late

Publishing succeeds immediately, but the Marketplace holds a first-time listing until
its automated validation finishes. During that window:

- `npx vsce show sudarsans.blame-the-extension` already works,
- the `.vsix` already downloads from the gallery API,
- but `marketplace.visualstudio.com/items?itemName=...` returns 404 and
  `code --install-extension sudarsans.blame-the-extension` says "not found".

Both start working once validation clears, usually minutes to a few hours. Nothing is
wrong and there is nothing to fix — do not re-publish to "kick" it.

### Releasing without the Marketplace, today

If you want a download link before the policy is set up, attach the built `.vsix` to
a GitHub Release:

```bash
npx vsce package
# then: github.com/sudarsansn12/blame-the-extension/releases/new -> upload the .vsix
```

Users install it with `code --install-extension blame-the-extension-0.1.0.vsix`.
This works for every VS Code fork including VSCodium and Cursor.

## 5. Verified publisher badge

Marketplace → your publisher → **Details** → **Verified**. It gives you a DNS `TXT`
record to add to a domain you own. Five minutes, and the listing stops looking
like a hobby project. Skip it if you do not own a domain.

## 6. Screenshot (the highest-value remaining task)

Take a real screenshot of the ranked list, save it as `media/screenshot.png`, and
uncomment the image line at the top of `README.md`. A listing with a screenshot
converts several times better than one without. `LAUNCH.md` assumes you have it.

---

## Before every publish

- [ ] `npm run compile` is clean
- [ ] `node scripts/test-attribution.js` passes
- [ ] `node scripts/test-logic.js` passes
- [ ] `node scripts/test-webview.js` passes
- [ ] version bumped in `package.json`
- [ ] `CHANGELOG.md` has an entry for that version
- [ ] `npx vsce ls` shows no `src/`, no `.map`, no stray files
- [ ] `media/icon.png` exists (512×512, regenerated with `npm run icon`)
