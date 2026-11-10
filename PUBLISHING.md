# Publishing

Everything below is copy-paste. Only step 1 needs a browser.

## 1. Get a Marketplace token (once)

1. Open <https://dev.azure.com> and sign in with the Microsoft account that owns the `devreadytools` publisher.
2. User settings → **Personal access tokens** → **New Token**.
3. Set **Organization: All accessible organizations**. Set **Scopes: Custom defined → Marketplace → Manage**.
4. Copy the token (starts with `a...`). It is shown once.

Then, in this folder:

```bash
export VSCE_PAT="paste-token-here"      # PowerShell: $env:VSCE_PAT="..."
npx vsce login devreadytools
```

`vsce login` stores the token so you never repeat it.

## 2. Publish

```bash
npx vsce publish            # publishes 0.1.0
npx vsce publish patch      # 0.1.0 -> 0.1.1
npx vsce publish minor      # 0.1.0 -> 0.2.0
```

Dry runs and inspection:

```bash
npx vsce package            # build the .vsix without uploading
npx vsce ls                 # exactly which files ship
code --install-extension blame-the-extension-0.1.0.vsix   # test locally first
```

The listing goes live after a short review (minutes for most extensions, longer for brand-new publishers).

## 3. Push to GitHub

`gh` is not installed on this machine. Either install it:

```bash
winget install --id GitHub.cli
gh auth login
gh repo create blame-the-extension --public --source . --remote origin --push
```

or create the repo by hand at <https://github.com/new> named exactly `blame-the-extension`,
then:

```bash
git remote add origin https://github.com/sudarsansn12/blame-the-extension.git
git push -u origin main
```

If you name the repo differently, update two fields in `package.json`
(`repository.url`, `bugs.url`) before publishing, otherwise the Marketplace
"Repository" link 404s.

## 4. Automate future releases (optional)

`.github/workflows/publish.yml` publishes whenever you push a `v*` tag. Add the
token as a repository secret named `VSCE_PAT`, then:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

## 5. Get the verified badge

Marketplace → Publisher page → **Verified publisher**: add the DNS `TXT` record
they give you. Takes five minutes and makes the listing look like a product
instead of a hobby.

## Checklist before every publish

- [ ] `npm run compile` is clean
- [ ] `node scripts/test-attribution.js` passes
- [ ] `node scripts/test-webview.js` passes
- [ ] version bumped in `package.json`
- [ ] `CHANGELOG.md` has an entry for that version
- [ ] a fresh screenshot (or GIF) is in `media/screenshot.png` and referenced in `README.md`
- [ ] `npx vsce ls` shows no `src/`, no `.map`, no stray files
