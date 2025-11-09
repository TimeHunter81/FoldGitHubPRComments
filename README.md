# FoldGitHubPRComments

Fold GitHub PR Comments is a Chrome extension that collapses older top-level
discussions on a pull request's Conversation tab so you can focus on the latest
talk track.

## What it does

- Keeps only the most recent top-level discussion expanded on initial load.
- Adds "Fold all" / "Unfold all" controls inline with the pull request subtitle.
- Injects per-thread toggles next to each timeline header.
- Watches GitHub's dynamic page updates and folds new discussion blocks as they
  appear.

## Development

Source files live under `src/`, and the compiled content script is emitted to
`dist/` by the TypeScript compiler.

```bash
npm install
npm run build
```

> **Note**
> The compiled JavaScript (`dist/content.js`) is checked in so the extension can
> be loaded without building when npm is unavailable.

## Download pre-built packages

The **Build Chrome extension package** workflow (triggered on releases or via
`workflow_dispatch`) zips the compiled extension and uploads both the bundle and
its SHA256 checksum. Grab the latest release asset from GitHub Releases for the
simplest install, or manually trigger the workflow if you need an interim build.

## Load the extension in Chrome

1. Download and extract `fold-github-pr-comments.zip` (from Releases or a
   workflow run) so `manifest.json` and the `dist/` directory sit side by side.
2. Navigate to `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and pick the folder from step 1 (or clone the repo
   and point Chrome at it directly).
4. Visit a PR conversation tab on GitHub to use the folding controls.

## Claude automation setup

Two optional GitHub Actions (`claude-code-review.yml` and `claude.yml`) call the
Claude Code action. Add `CLAUDE_CODE_OAUTH_TOKEN` under **Settings → Secrets and
variables → Actions** so the workflows can authenticate. When the secret is
absent the jobs still run but skip the action with a warning, keeping the build
status green.

## Privacy

The extension only runs on `github.com` pages and never transmits data off your
device.

## Limitations

- Only top-level discussion items are folded; inline review threads remain
  untouched.
- Remembering manual fold states across navigations is planned for a follow-up.
