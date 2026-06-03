# @sublay/node

[![npm](https://img.shields.io/npm/v/@sublay/node.svg)](https://www.npmjs.com/package/@sublay/node)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

> **Backend infrastructure for user-powered products.** Pre-modeled bundles for the layers every app ends up rebuilding — comments, notifications, files, search, chat, and more. Install what you need, call through one SDK. Build the part that's actually yours.

Server-side Node.js SDK for Sublay. For backends, server actions, webhook handlers, scheduled jobs, and any other server-side code that needs to talk to the Sublay API with admin-level scope.

Exposes a single `SublayClient` with module namespaces for `auth`, `comments`, `entities`, `hostedApps`, `search`, `spaces`, and `users`.

```bash
npm install @sublay/node
```

```ts
import { SublayClient } from "@sublay/node";

const sublay = await SublayClient.init({
  projectId: process.env.SUBLAY_PROJECT_ID!,
  secretKey: process.env.SUBLAY_SECRET_KEY!,
});

await sublay.entities.create({ ... });
```

See [docs.sublay.io](https://docs.sublay.io) for the full reference.

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
