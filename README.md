# Codextend

Chrome extension to extend OpenAI Codex cloud functionality, built with the [Plasmo browser extension framework](https://docs.plasmo.com/).

## Getting started

Install dependencies:

```bash
npm install
```

Start a development build that auto-reloads in your browser:

```bash
npm run dev
```

After running the dev server, load the unpacked extension from the generated `build/chrome-mv3-dev` directory.

## Available scripts

- `npm run dev` – start the Plasmo development server.
- `npm run build` – generate a production build of the extension in `build/`.
- `npm run zip` – build and package the extension into a store-ready archive.
- `npm run lint` – run ESLint using the project TypeScript configuration.
- `npm run test` – execute unit tests with Vitest.
- `npm run typecheck` – perform a TypeScript project-wide type check.

## Styling

Tailwind CSS powers the popup UI. Global styles live in [`style.css`](./style.css) and are pulled into the popup entry so all components can use Tailwind utility classes out of the box.

## Customizing Nerch keyword detection

The extension highlights conversations that match a configurable set of keywords defined in [`src/config.ts`](./src/config.ts). By default the list contains the single term `"nerch"`, but you can add or remove terms at runtime by updating the stored settings:

```ts
import { loadMatchSettings, saveMatchSettings } from "./src/lib/storage";

const settings = await loadMatchSettings();
settings.keywords = [...settings.keywords, "my new keyword"];
await saveMatchSettings(settings);
```

The helper functions automatically normalize keywords so tests in CI (`npm run test`) behave the same way as the extension runtime.

## Manifest permissions

The extension requests the following Chrome permissions:

- `activeTab`
- `scripting`
- `storage`

It also declares host permissions for both `https://chatgpt.com/*` and `https://chat.openai.com/*` to interact with ChatGPT experiences across domains.
