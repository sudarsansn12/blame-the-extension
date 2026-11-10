# Publishing — Sudarsan S

Publisher ID: **`sudarsans`**
Extension ID will be: **`sudarsans.blame-the-extension`**

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

## 2. Create the access token (once, browser)

1. Go to <https://dev.azure.com> → User settings (top right) → **Personal access tokens** → **New Token**.
2. **Organization: All accessible organizations** ← the default "single org" token fails with a confusing 401.
3. **Scopes: Custom defined** → scroll to **Marketplace** → tick **Manage**.
4. Copy the token now; it is shown once.

## 3. Publish

```bash
export VSCE_PAT="paste-the-token"        # PowerShell: $env:VSCE_PAT="paste-the-token"
npx vsce login sudarsans
npx vsce publish
```

`vsce login` stores the token, so you only paste it once per machine.

Useful variants:

```bash
npx vsce package                 # build the .vsix without uploading
npx vsce ls                      # exactly which files ship
npx vsce publish patch           # 0.1.0 -> 0.1.1
npx vsce publish minor           # 0.1.0 -> 0.2.0
```

The listing appears after a short automated review. New publishers sometimes wait
longer than established ones — that is normal, not a rejection.

## 4. Push to GitHub

`gh` is not installed here. Install it once:

```bash
winget install --id GitHub.cli
gh auth login
gh repo create blame-the-extension --public --source . --remote origin --push
```

Or create the repo manually at <https://github.com/new> and then:

```bash
git remote add origin https://github.com/<your-username>/blame-the-extension.git
git push -u origin main
```

**If your GitHub username is not `Sudarsan-S`**, update these two fields in
`package.json` before publishing:

```json
"repository": { "type": "git", "url": "https://github.com/<you>/blame-the-extension" },
"bugs": { "url": "https://github.com/<you>/blame-the-extension/issues" }
```

Otherwise the "Repository" link on your Marketplace page is a 404.

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
- [ ] `node scripts/test-webview.js` passes
- [ ] version bumped in `package.json`
- [ ] `CHANGELOG.md` has an entry for that version
- [ ] `npx vsce ls` shows no `src/`, no `.map`, no stray files
- [ ] `media/icon.png` exists (512×512, regenerated with `npm run icon`)
