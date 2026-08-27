# @sublay/cli

[![npm](https://img.shields.io/npm/v/@sublay/cli.svg)](https://www.npmjs.com/package/@sublay/cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

> **Backend infrastructure for user-powered products.** Pre-modeled bundles for the layers every app ends up rebuilding — comments, notifications, files, search, chat, and more. Install what you need, call through one SDK. Build the part that's actually yours.

Component installer for Sublay. It copies full, working UI components — comment sections, notification controls — into your own source tree as editable files, the way `shadcn/ui` does. They are yours after that: no component package to upgrade, no wrapper to fight, just files you can edit.

The components it installs are built on the Sublay SDKs ([`@sublay/react-js`](https://www.npmjs.com/package/@sublay/react-js), [`@sublay/react-native`](https://www.npmjs.com/package/@sublay/react-native), [`@sublay/expo`](https://www.npmjs.com/package/@sublay/expo)) and the [`@sublay/ui-core-*`](https://www.npmjs.com/package/@sublay/ui-core-react-js) primitives, so install those in your project first.

## Usage

No global install needed — run it with `npx`.

```bash
npx @sublay/cli init
```

`init` detects your framework and TypeScript setup, asks which platform (`react`, `react-native`, or `expo`) and style (`styled` or `tailwind`) you want, and writes a `sublay.json` at your project root recording those answers plus where components should land.

```bash
npx @sublay/cli add comments-threaded
```

`add` reads `sublay.json`, downloads the matching component from the registry, writes its files into your components directory, and generates an `index.ts` barrel so you can import it directly:

```tsx
import { ThreadedCommentSection } from "@/components/comments-threaded";
```

### Available components

| Component | React | React Native / Expo |
| --- | --- | --- |
| `comments-threaded` | styled, tailwind | tailwind |
| `comments-social` | styled, tailwind | styled, tailwind |
| `notifications-control` | styled, tailwind | — |

Expo projects install the React Native variants. Not every component ships every platform/style pairing yet; `add` tells you when the combination in your `sublay.json` isn't available.

See [docs.sublay.io](https://docs.sublay.io) for the full component reference.

---

## What is Sublay

Every user-powered product runs into the same engineering problems — content modeling, threaded discussions, permission graphs, ranking pipelines, search indexing, notification fan-out, social graphs, and moderation queues. Sublay solves them, so you don't have to.

Sublay ships these layers as **pre-modeled bundles** that attach to one shared entity model. You install the bundles you need from the dashboard, call them through any Sublay SDK, and build the part that's actually yours on top.

## Bundles you can install

- **Comments & Threads** — threaded discussions with mentions, replies, sorting
- **Reactions & Votes** — upvotes, downvotes, multi-emoji reactions
- **Spaces & Communities** — groups, sub-forums, membership
- **Notifications** — in-app notification fan-out with optional webhook delivery
- **Feeds & Discovery** — hot / top / new / controversial, filtered by tag, geography, timeframe, or follow graph
- **Real-Time Chat** — direct messages and group threads
- **Follows & Connections** — one-way follows, mutual connections
- **Files & Storage** — file blob storage with managed upload URLs
- **AI-Powered Search** — semantic search across your entity tree
- **Moderation** — report queues and content-removal workflows

Every bundle attaches to the same model. No mismatches, no extra databases. One schema for everything.

## How it works

1. Create a project at [dash.sublay.io](https://dash.sublay.io) and install the bundles you need.
2. Install a Sublay SDK in your app — this one, or one of its siblings (see below).
3. Optionally drop in the open-source [`@sublay/ui-core-*`](https://github.com/sublay/ui-core) primitives, or install full components via the Sublay CLI registry.

## The Sublay dashboard

The dashboard at [dash.sublay.io](https://dash.sublay.io) is a database/backend console for your project:

- **Overview** — usage metrics and project health
- **Authentication** — end users and OAuth providers
- **Database** — schema browser (tables, relationships) and a table editor for browsing rows
- **Storage** — file blobs uploaded through the Files bundle
- **Reports** — moderation queue across entity and comment reports
- **Broadcast** — send notifications to your users
- **Settings** — domains, webhooks, integrations, members, secrets, billing

## The Sublay SDK family

- [`@sublay/core`](https://www.npmjs.com/package/@sublay/core) — platform-agnostic hooks and utilities
- [`@sublay/react-js`](https://www.npmjs.com/package/@sublay/react-js) — React (web)
- [`@sublay/react-native`](https://www.npmjs.com/package/@sublay/react-native) — React Native
- [`@sublay/expo`](https://www.npmjs.com/package/@sublay/expo) — Expo with SecureStore token storage
- [`@sublay/node`](https://www.npmjs.com/package/@sublay/node) — server-side Node.js (backends, server actions, webhook handlers)
- [`@sublay/js`](https://www.npmjs.com/package/@sublay/js) — framework-agnostic JavaScript (browser apps without React)
- [`@sublay/ui-core-react-js`](https://www.npmjs.com/package/@sublay/ui-core-react-js) / [`@sublay/ui-core-react-native`](https://www.npmjs.com/package/@sublay/ui-core-react-native) — open-source UI primitives

## Documentation

Full API reference, SDK guides, and recipes: **[docs.sublay.io](https://docs.sublay.io)**

## Community & support

- **Discord** — [discord.gg/REKxnCJzPz](https://discord.gg/REKxnCJzPz)
- **Blog** — [blog.sublay.io](https://blog.sublay.io)
- **X** — [@yantsab](https://x.com/yantsab)
- **LinkedIn** — [linkedin.com/company/sublay](https://www.linkedin.com/company/sublay)
- **Email** — [support@sublay.io](mailto:support@sublay.io)

## License

Apache 2.0
