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

## Loading the extension

1. Run the build step above (optional if you are using the bundled `dist/content.js`).
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose the repository directory.
5. Navigate to a GitHub pull request conversation tab to see the folding controls.

## Scope and limitations

- Only GitHub pull request conversation pages on `github.com` are matched.
- Folding currently applies to top-level discussion items; inline review comments are left untouched.
- Remembering manual fold states across navigations is planned as a follow-up improvement.
