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

## Manifest permissions

The extension requests the following Chrome permissions:

- `activeTab`
- `scripting`
- `storage`

It also declares host permissions for both `https://chatgpt.com/*` and `https://chat.openai.com/*` to interact with ChatGPT experiences across domains.
