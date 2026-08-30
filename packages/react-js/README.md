# @sublay/react-js

[![npm](https://img.shields.io/npm/v/@sublay/react-js.svg)](https://www.npmjs.com/package/@sublay/react-js)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

> **Backend infrastructure for user-powered products.** Pre-modeled bundles for the layers every app ends up rebuilding — comments, notifications, files, search, chat, and more. Install what you need, call through one SDK. Build the part that's actually yours.

React (web) SDK for Sublay. Hooks, context providers, and helpers for calling Sublay from a React app. Re-exports from [`@sublay/core`](https://www.npmjs.com/package/@sublay/core).

```bash
npm install @sublay/react-js
```

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
2. Install a Sublay SDK in your app — this one, or one of its siblings (see below).
3. Optionally drop in the open-source [`@sublay/ui-core-*`](https://github.com/sublay-io/monorepo/tree/main/packages/ui-core-react-js) primitives, or install full components via the Sublay CLI registry.

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
