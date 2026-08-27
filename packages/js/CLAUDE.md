# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@sublay/js** is the official framework-agnostic JavaScript SDK for Sublay. It targets browser apps and JS runtimes that don't use React (or don't want the React provider tree). It mirrors the Sublay **v7** server API, authenticated as an **end user** via a bearer token — no React, no Redux, no state management.

- **Package**: `@sublay/js`
- **Version**: 7.0.0 (tracks the v7 server API)
- **Type**: published npm library (CJS + ESM)
- **Only runtime dependency**: `axios`
- **Base URL**: `https://api.sublay.io/v7/{projectId}`

> Sibling SDKs: `@sublay/node` is the server-side SDK (authenticates with a **service key** and may act on behalf of any user). This SDK is its user-token counterpart. The two share the same module/file layout and the `bindModule` pattern, so `@sublay/node` is a useful reference donor — but with one inversion (see **Rule A** below).

## Development Commands

```bash
pnpm build          # tsup → dist/ (CJS + ESM + .d.ts)
pnpm build:types    # tsc --emitDeclarationOnly (type-check + emit declarations)
pnpm prepare        # build + build:types (runs before publish)
```

Publishing runs from the monorepo root, not this directory: `pnpm js:publish-beta:patch` / `pnpm js:publish-prod:patch` (`:minor` variants exist too).

Always use the `:patch` / `:minor` form. The bare `js:publish-beta` / `js:publish-prod` scripts build, test, and publish but never bump the version — and `pnpm publish` silently skips a package whose current version is already on the registry and exits 0, so a bare run without a separate version bump looks like a successful release and ships nothing. The `:patch` / `:minor` variants are just `js:version:{patch,minor} && js:publish-{beta,prod}`. Use a bare form only when the version was already bumped as a deliberate separate step (`pnpm js:version:patch`).

When verifying changes during development, prefer `npx tsc --noEmit` (read-only) over `pnpm build`, which overwrites `dist/`.

## Architecture

### The client

`SublayClient.init(config)` (in [src/index.ts](src/index.ts)) constructs a `SublayHttpClient` ([src/core/client.ts](src/core/client.ts)) and returns a client whose 14 module namespaces are pre-bound to it.

```ts
const sublay = await SublayClient.init({
  projectId,
  initialTokens?,   // hydrate from a persisted session (SDK-managed mode)
  getToken?,        // providing this switches to host-managed mode
  onAuthChange?,    // notified when the SDK sets/rotates/clears tokens (SDK-managed mode)
});
```

### Two auth modes

- **SDK-managed (default)** — the SDK keeps `accessToken`/`refreshToken` in memory, attaches `Authorization: Bearer` on every request, auto-refreshes on a `403` (single-flight mutex), and fires `onAuthChange` so the host can persist tokens. No storage is baked in (the SDK must run in any JS runtime), so persistence is the host's job via `onAuthChange` + `initialTokens`.
- **Host-managed** — set when `getToken` is provided. The SDK never stores or refreshes; it reads the current token from `getToken()` on each request, and on a `403` re-reads it once. `setTokens`/`clearTokens`/`setAccessToken` are all no-ops in this mode.

An explicit `Authorization` header on a request always wins over both.

**Refresh-token rotation (important):** the v7 server *rotates* the refresh token on every refresh and runs reuse detection — re-sending a spent refresh token destroys the whole session family. So `refreshAccessToken()` and `auth.requestNewAccessToken` must persist the **new** `refreshToken` from the response (via `setTokens`), not just the access token.

### `bindModule` pattern

Every module function is written as `(client: SublayHttpClient, data) => Promise<...>`. At init, `bindModule` partially applies the client so callers write `sublay.entities.fetchEntity({ entityId })` (no client arg). Adding a function = add the file, export it from the module's `index.ts`, and (for a new module) bind it in [src/index.ts](src/index.ts).

### Rule A — the user-token inversion (READ THIS before porting from @sublay/node)

`@sublay/node` is a service-key SDK with no inherent user, so it passes an explicit `userId`/`actingUserId` to tell the server who is acting. This SDK uses a **user token**, so the server derives the actor from the token. **When porting a function, DROP the actor param.** Decide per-param by reading the server controller:

- Param feeds `resolveUserId(...)` / `resolveActingUserId(...)` / `req.userId` (the **actor**) → **drop it**.
- Param is a path `:userId` target, a ban/moderation **target**, or a genuine query **filter** (e.g. "entities by this author") → **keep it**.
- Param the controller never reads → drop it.

Sending an actor param a user token shouldn't set → `403` or silently ignored. This is the single most common porting mistake.

### Mirror the server exactly

The server's zod schemas + controllers are the source of truth ([server/src/v7-schema/controllers/](../server/src/v7-schema/controllers/)). Expose the server's exact param names (no aliases/renames), drop params the server ignores, and type returns to what the controller actually responds with (`res.json(...)`) — not what a naive port assumed. The `@sublay/node` donor has several wrong return types; verify against the controller, not the donor.

### Multipart uploads

File-bearing requests use `FormData` and the shared helpers in [src/core/multipart.ts](src/core/multipart.ts) (`appendField` / `appendFields` / `appendFile`): object/array fields are JSON-stringified (the server re-parses them), scalars are coerced to strings, `undefined` is skipped. Don't set `Content-Type` manually — axios sets it to `undefined` for a `FormData` body so the browser writes the multipart boundary. Used by `storage.uploadFile`/`uploadImage`, `chat.sendMessage` (field `files`), and `users.updateUser` (`avatarFile`/`bannerFile` + `<field>.options`).

### Interfaces

[src/interfaces/](src/interfaces/) holds the response/model types (Entity, Comment, User/AuthUser, Space, Conversation, ChatMessage, Follow/FollowListItem, Connection, Collection, Reaction, File, ImageProcessing, Report, AppNotification, OAuthIdentity, Mention, Rule, IPaginatedResponse, …), ported from `@sublay/node`. Reuse them; don't invent parallel types. Note `IPaginatedResponse` (`{ data, pagination: { page, pageSize, totalPages, totalItems, hasMore } }`) matches the server's `createPaginatedResponse` helper — but a few endpoints return bespoke shapes (cursor pagination, raw arrays, `{ data, pagination: { ...limit/total } }`), so confirm per endpoint.

## Modules (14 namespaces, `sublay.<module>.<fn>`)

Source under [src/modules/](src/modules/); each folder has one file per function + an `index.ts` barrel.

- **auth** — `signUp`, `signIn`, `signOut`, `requestNewAccessToken`, `verifyExternalUser`, `requestPasswordReset`, `resetPassword`, `changePassword`, `verifyEmail`, `sendVerificationEmail`
- **users** — `fetchUserById`, `fetchUserByForeignId`, `fetchUserByUsername`, `fetchUserSuggestions`, `checkUsernameAvailability`, `updateUser` (multipart avatar/banner), plus the **per-user** graph: `fetchFollowers/FollowingByUserId`, `fetchFollowers/FollowingCountByUserId`, `fetchConnections/ConnectionsCountByUserId`, `createFollow`, `deleteFollow`, `fetchFollowStatus`, `requestConnection`, `fetchConnectionStatus`, `removeConnectionByUserId` (these hit `/users/:userId/*` — an *arbitrary* user)
- **entities** — `createEntity`, `fetchEntity`, `fetchEntityByForeignId`, `fetchEntityByShortId`, `fetchManyEntities` (feeds + filters), `updateEntity`, `deleteEntity`, `fetchDrafts`, `publishDraft`, `fetchTopComment`, `addReaction`, `removeReaction`, `fetchReactions`, `getUserReaction`, `isEntitySaved`
- **comments** — `createComment`, `fetchComment`, `fetchCommentByForeignId`, `updateComment`, `deleteComment`, `fetchManyComments`, `addReaction`, `removeReaction`, `fetchReactions`, `getUserReaction` (reaction add/remove return the full `Comment`)
- **spaces** (34 fns) — lifecycle, membership/roles, rules, and moderation (report handlers, message moderation). Report/ban handlers KEEP `userId` as the **ban target**.
- **collections** — `fetchRootCollection`, `fetchSubCollections`, `createNewCollection`, `fetchCollectionEntities`, `addEntityToCollection`, `removeEntityFromCollection`, `updateCollection`, `deleteCollection`
- **follows** / **connections** — the **logged-in user's own** graph (`/follows/*`, `/connections/*`) — distinct from the `/users/:userId/*` functions in the users module
- **appNotifications** — `fetchNotifications`, `countUnreadNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`
- **reports** — `createReport`, `fetchModeratedReports`
- **search** — `searchContent`, `searchUsers`, `searchSpaces` (return raw arrays of `{ similarity, record }`), and `askContent` — an **SSE async generator** (`for await` it; cancel via `AbortSignal` or `break`). It uses `fetch` (not axios), so it reads the token via `client.getAuthHeader()` and does NOT get the auto-refresh retry.
- **storage** — `uploadFile`, `uploadImage`, `getFile`, `deleteFile` (browser `File`/`Blob`)
- **oauth** — `authorize`, `linkIdentity` (both: `{ provider, redirectAfterAuth }` → `{ authorizationUrl }`, redirect flow), `listIdentities`, `unlinkIdentity`
- **chat** (20 fns) — conversations (incl. **cursor** pagination on `listConversations`/`listMessages`), members, messages (`sendMessage` supports multipart `files`), reactions, `markAsRead` (`{ messageId }`). Reporting a message is **not** here — use `reports.createReport` with `targetType: "message"`.

## Critical files

- [src/index.ts](src/index.ts) — `SublayClient`, `init`, `bindModule`, module wiring, public type re-exports
- [src/core/client.ts](src/core/client.ts) — `SublayHttpClient`: auth modes, interceptors, refresh+rotation, `getAuthHeader`
- [src/core/multipart.ts](src/core/multipart.ts) — shared `FormData` helpers
- [src/modules/*/index.ts](src/modules/) — per-module barrels
- [src/interfaces/](src/interfaces/) — response/model types

## Conventions

- One function per file; export it from the module `index.ts`.
- `(client, data)` signature; keep the server's exact param names; apply **Rule A**.
- Type returns to the controller's actual response; reuse `src/interfaces/` types.
- TypeScript strict mode; framework-agnostic (no DOM-only assumptions beyond `fetch`/`FormData`, which the build's `lib` provides).
