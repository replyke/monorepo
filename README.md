# Sublay

[![npm @sublay/core](https://img.shields.io/npm/v/@sublay/core.svg?label=%40sublay%2Fcore)](https://www.npmjs.com/package/@sublay/core)
[![npm @sublay/react-js](https://img.shields.io/npm/v/@sublay/react-js.svg?label=%40sublay%2Freact-js)](https://www.npmjs.com/package/@sublay/react-js)
[![npm @sublay/react-native](https://img.shields.io/npm/v/@sublay/react-native.svg?label=%40sublay%2Freact-native)](https://www.npmjs.com/package/@sublay/react-native)
[![npm @sublay/expo](https://img.shields.io/npm/v/@sublay/expo.svg?label=%40sublay%2Fexpo)](https://www.npmjs.com/package/@sublay/expo)
[![npm @sublay/node](https://img.shields.io/npm/v/@sublay/node.svg?label=%40sublay%2Fnode)](https://www.npmjs.com/package/@sublay/node)
[![npm @sublay/js](https://img.shields.io/npm/v/@sublay/js.svg?label=%40sublay%2Fjs)](https://www.npmjs.com/package/@sublay/js)
[![npm @sublay/cli](https://img.shields.io/npm/v/@sublay/cli.svg?label=%40sublay%2Fcli)](https://www.npmjs.com/package/@sublay/cli)
[![npm @sublay/ui-core-react-js](https://img.shields.io/npm/v/@sublay/ui-core-react-js.svg?label=%40sublay%2Fui-core-react-js)](https://www.npmjs.com/package/@sublay/ui-core-react-js)
[![npm @sublay/ui-core-react-native](https://img.shields.io/npm/v/@sublay/ui-core-react-native.svg?label=%40sublay%2Fui-core-react-native)](https://www.npmjs.com/package/@sublay/ui-core-react-native)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

> **Infrastructure for user-powered products.** Pre-modeled bundles for the layers every app ends up rebuilding — comments, notifications, files, search, chat, and more. Install what you need, call through one SDK. Build the part that's actually yours.

This repository is the whole Sublay platform's SDK/tooling/docs surface, as one pnpm workspace — 9 published npm packages across 5 independently-versioned groups, the CLI + component registry, and the docs site:

- [`@sublay/core`](packages/core) — shared hooks, context providers, and utilities for the React, React Native, and Expo SDKs (not used by `node`/`js`, which are independent)
- [`@sublay/react-js`](packages/react-js) — React (web)
- [`@sublay/react-native`](packages/react-native) — React Native
- [`@sublay/expo`](packages/expo) — Expo with SecureStore-backed token storage
- [`@sublay/node`](packages/node) — server-side Node.js (backends, server actions, webhooks)
- [`@sublay/js`](packages/js) — framework-agnostic JavaScript (no React required)
- [`@sublay/ui-core-react-js`](packages/ui-core-react-js) / [`@sublay/ui-core-react-native`](packages/ui-core-react-native) — open-source presentational UI primitives
- [`@sublay/cli`](packages/cli) — shadcn-style component installer, backed by [`registry/`](registry)

Each framework SDK (`react-js`, `react-native`, `expo`) re-exports from `@sublay/core` and adds the platform-specific bits (token storage, etc.). Full API reference and SDK guides live at [`docs/`](docs) in this same repo, served at [docs.sublay.io](https://docs.sublay.io).

---

## What is Sublay

Every user-powered product runs into the same engineering problems — content modeling, threaded discussions, permission graphs, ranking pipelines, search indexing, notification fan-out, social graphs, and moderation queues. Sublay solves them, so you don't have to.

Sublay ships these layers as **pre-modeled bundles** that attach to one shared entity model. You install the bundles you need from the dashboard, call them through any Sublay SDK, and build the part that's actually yours on top.

## Bundles you can install

Every project always includes the **`core`** bundle — users, authentication, and OAuth identity — installed automatically and it can't be removed. On top of that, install only what your product needs:

- **Entities** (`entities`) — the base content unit for anything your users create (posts, articles, listings), with views, drafts, and publishing
- **Comments** (`comments`) — threaded comments on entities · requires `entities`
- **Reactions** (`reactions`) — emoji reactions on entities and comments
- **Storage** (`files-images`) — file and image uploads, including user avatars and banners
- **Follows** (`follows`) — one-way follow relationships
- **Connections** (`connections`) — bidirectional, friend-style connection requests
- **Spaces** (`spaces`) — hierarchical community spaces with membership, roles, and rules
- **Workspaces** (`workspaces`) — self-nesting SaaS/team workspaces with invitations and per-member authority
- **Chat** (`chat`) — real-time 1:1 and group conversations with message reactions
- **Collections** (`collections`) — user-owned bookmarking and folders for saving entities · requires `entities`
- **Events** (`events`) — online, physical, or hybrid events with RSVP tracking, capacity limits, hosts, and invites
- **Moderation** (`moderation`) — reports, report resolution, user blocking, and account suspensions
- **App Notifications** (`notifications`) — in-app notification fan-out
- **Push Notifications** (`push`) — native push delivery to iOS, Android, and Web
- **Reputation** (`reputation`) — per-space reputation buckets, a maintained overall total per user, and reputation grants
- **Semantic Search & AI** (`ai-search`) — content embeddings, semantic search, and an AI-answer endpoint
- **Interest Matching** (`interest-matching`) — activity-derived interest facets for matching users by what they engage with · requires `ai-search`

Every bundle attaches to the same project schema — no mismatches, no extra databases. Install, remove, or add bundles at any time from the dashboard's Database page; removing a bundle drops its tables (and clears references to it from other bundles) for good.

## How it works

1. Create a project at [dash.sublay.io](https://dash.sublay.io) and install the bundles you need.
2. Install a Sublay SDK in your app — see the full family below.
3. Optionally drop in the open-source [`@sublay/ui-core-*`](packages) primitives, or install full components via `npx @sublay/cli add` (see [`packages/cli`](packages/cli)).

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

- [`@sublay/core`](https://www.npmjs.com/package/@sublay/core) — hooks and utilities shared across the React, React Native, and Expo SDKs
- [`@sublay/react-js`](https://www.npmjs.com/package/@sublay/react-js) — React (web)
- [`@sublay/react-native`](https://www.npmjs.com/package/@sublay/react-native) — React Native
- [`@sublay/expo`](https://www.npmjs.com/package/@sublay/expo) — Expo with SecureStore token storage
- [`@sublay/node`](https://www.npmjs.com/package/@sublay/node) — server-side Node.js (backends, server actions, webhook handlers)
- [`@sublay/js`](https://www.npmjs.com/package/@sublay/js) — framework-agnostic JavaScript (browser apps without React)
- [`@sublay/ui-core-react-js`](https://www.npmjs.com/package/@sublay/ui-core-react-js) / [`@sublay/ui-core-react-native`](https://www.npmjs.com/package/@sublay/ui-core-react-native) — open-source UI primitives
- [`@sublay/cli`](https://www.npmjs.com/package/@sublay/cli) — installs full, editable components (shadcn-style) built on the above

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
