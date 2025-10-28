# Codextend

Codextend is a Chrome extension that augments the OpenAI Codex cloud UI. It is built with the [Plasmo browser extension framework](https://docs.plasmo.com/) and uses React, TypeScript, and Tailwind CSS for the popup interface.

## Prerequisites

- Node.js 18 or newer (Plasmo targets the active LTS release).
- npm 9+ (bundled with Node 18).

## Setup

```bash
npm install
```

## Development workflow

```bash
npm run dev
```

The command above runs the Plasmo dev server, generates assets, and watches for file changes. When it is ready, load the unpacked extension from `build/chrome-mv3-dev` in Chrome.

### Project commands

- `npm run dev` – start the Plasmo development server.
- `npm run build` – produce a production bundle in `build/`.
- `npm run zip` – package the production bundle for store submission.
- `npm run lint` – lint `src/**/*.ts?(x)` and `tests/**/*.ts` with ESLint and the project TypeScript config.
- `npm run test` – execute the Vitest suite (matcher logic, DOM helpers, selectors, and archive flows).
- `npm run typecheck` – run `tsc --noEmit` for an additional type-safety pass.

### Architecture overview

- [`src/config.ts`](./src/config.ts) centralizes runtime constants such as Nerch keyword defaults, retry counts, and scan limits.
- [`src/lib/selectors.ts`](./src/lib/selectors.ts) defines the selectors map (`SELECTORS`) and helper utilities for navigating task rows and menus.
- [`src/lib/dom.ts`](./src/lib/dom.ts) exposes DOM utilities (query helpers, waiters, click + scroll helpers) that power automation flows.
- [`src/lib/archive.ts`](./src/lib/archive.ts) orchestrates scanning, archiving, retry logic, and confirmation polling.
- [`src/ui/Panel.tsx`](./src/ui/Panel.tsx) together with [`src/ui/panelStore.ts`](./src/ui/panelStore.ts) renders the sidebar UI, tracks panel state, and surfaces the confirmation dialog.
- [`tests/`](./tests) contains Vitest specs for archive workflows, selector utilities, DOM helpers, and keyword matching.

### Manual QA checklist

1. `npm run dev` and load the unpacked extension from `build/chrome-mv3-dev`.
2. Navigate to the Codex task list (ChatGPT) and open the Codextend panel.
3. Verify Nerch-related conversations are detected (highlighted/listed) using the default keyword from `src/config.ts`.
4. Trigger the archive action on a Nerch thread:
   - Confirm the confirmation dialog appears the first time, that focus moves to the confirm button, and the dialog blocks automation until acknowledged.
   - Accept the dialog and ensure the task archives successfully.
   - Trigger another archive and confirm the dialog stays hidden once acknowledgment is persisted (stored via `panelStore`).
5. Toggle between different task rows and ensure selectors (menu buttons, archive action) continue to function.

### Required checks before submitting changes

Run the following commands locally and ensure they succeed:

- `npm run lint`
- `npm run test`
- `npm run build`

These commands are expected to pass in CI as well; running them locally prevents regressions and avoids churn in review.

## Customizing Nerch keyword detection

The extension highlights conversations that match a configurable set of keywords defined in [`src/config.ts`](./src/config.ts). By default the list contains the single term `"nerch"`, but you can add or remove terms at runtime by updating the stored settings:

```ts
import { loadMatchSettings, saveMatchSettings } from "./src/lib/storage"

const settings = await loadMatchSettings()
settings.keywords = [...settings.keywords, "my new keyword"]
await saveMatchSettings(settings)
```

Keywords are normalized (trimmed, deduplicated, and lower-cased) before persisting so tests (`npm run test`) and runtime behavior remain aligned.

## Manifest permissions

The extension requests the following Chrome permissions:

- `activeTab`
- `scripting`
- `storage`

It also declares host permissions for both `https://chatgpt.com/*` and `https://chat.openai.com/*` to interact with ChatGPT experiences across domains.
