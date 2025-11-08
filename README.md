# Fold GitHub PR Comments

This Chrome extension collapses older top-level comments on GitHub pull request conversation tabs. By default, it keeps only the most recent discussion expanded while providing controls to fold or unfold threads directly from the page header.

## Features

- Fold every top-level discussion except the newest one when the page loads (configurable with a checkbox inline with the pull request subtitle).
- Inline "Fold all" and "Unfold all" actions for quick bulk changes.
- Per-thread fold toggles injected next to each comment header.
- Automatic handling of newly added timeline items without reloading the page.

## Development

The source TypeScript content script lives in `src/content.ts`. The compiled script that Chrome loads is stored in `dist/content.js`.

To rebuild the content script:

```bash
npm install
npm run build
```

> **Note:** Installing dependencies requires access to the npm registry. If the registry is unavailable, you can still use the precompiled `dist/content.js` checked into the repository.

## Downloading a pre-built package

Each published GitHub release automatically runs the **Build Chrome extension package** workflow and attaches a `fold-github-pr-comments.zip` bundle (and matching SHA256 checksum) to the release assets. The archive contains the compiled content script and manifest, so you can download it directly from the **Releases** tab without cloning the repository.

If you need an interim build between releases, manually trigger the workflow from **Actions → Build Chrome extension package → Run workflow**. The resulting artifact appears on that run with the same zip and checksum files.

## Loading the extension

1. Download the latest `fold-github-pr-comments.zip` from the most recent release (or from a manually triggered Actions run, or build it yourself using the steps above).
2. Extract the archive so that the `manifest.json` and `dist/` folder are in the same directory.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked** and choose the extracted directory (or the repository directory).
6. Navigate to a GitHub pull request conversation tab to see the folding controls.

## Configuring Claude workflows

The repository ships with two optional GitHub Actions workflows that rely on the
`CLAUDE_CODE_OAUTH_TOKEN` secret. To add the secret:

1. Open the repository on GitHub and go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Enter `CLAUDE_CODE_OAUTH_TOKEN` as the name and paste the OAuth token you already use in your other repository.
4. Click **Add secret**.

When the secret is present, the workflows will run normally. If it is missing,
the jobs still execute but emit a warning and skip calling the Claude action so
the runs remain green.

## Privacy

The extension runs entirely on your machine and only interacts with pages served from `github.com`. It does not collect, transmit, or store any browsing data.

## Scope and limitations

- Only GitHub pull request conversation pages on `github.com` are matched.
- Folding currently applies to top-level discussion items; inline review comments are left untouched.
- Remembering manual fold states across navigations is planned as a follow-up improvement.
