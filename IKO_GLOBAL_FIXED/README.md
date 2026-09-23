# IKO Context HUD — Global Build 0.2.0

IKO is a Chrome MV3 extension for the IKO Context HUD and ChatGPT ↔ Claude session migration.

## Global installation

1. Extract the ZIP.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `claude-counter-main` folder — the folder containing `manifest.json` and `background.js`.
6. Open a **new** ChatGPT or Claude tab after installation.

No Node.js, npm, localhost server, API key, or backend is required for migration.

## Migration

- ChatGPT → Claude
- Claude → ChatGPT
- The migration package is stored by the MV3 service worker before the destination tab is opened.
- Destination pages retrieve the package through the service worker.
- The implementation avoids `window.open()` so browser pop-up blocking does not break migration.
- Stale extension contexts are caught instead of producing an uncaught `Extension context invalidated` exception.

## Account access

IKO only reads conversations that the currently logged-in ChatGPT or Claude account can access. It cannot bypass platform permissions.

## Token HUD

ChatGPT token counting remains local. Claude's public/global build uses a local estimate so the extension does not require a personal Anthropic API key or a localhost backend.

The estimate is intentionally labeled as an estimate rather than claiming to be Anthropic's exact server-side count.

## Development build

If you want to rebuild the extension from source:

```bash
npm install
npm run build
```

The ready-to-load `dist/` files are already included in the release ZIP, so normal users do not need to run these commands.
