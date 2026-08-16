# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **@sublay/node** package - the official Node.js SDK for Sublay. It's designed for server-side Node.js environments where React is not available or needed, such as server actions, backend APIs, scheduled jobs, webhooks, and CLI tools.

**Package Name**: @sublay/node
**Version**: 7.0.0
**Type**: Node.js SDK library (published to npm)

## Development Commands

```bash
# Build the package
pnpm build

# Generate TypeScript declaration files
pnpm build:types

# Build both (runs before publishing)
pnpm prepare

# Publish to npm with beta tag
pnpm publish-beta

# Publish to npm production
pnpm publish-prod
```

## Core Architecture

### Module Structure

The SDK exposes **16 modules** bound on `SublayClient` (camelCase accessor in
parentheses). Every endpoint is reached with a **service key**; operations that
act on behalf of a user take an explicit `userId` (or `actingUserId` on the
nested `users` follow/connection routes and the `chat` target routes), since a
service key has no implicit session user.

```
src/
├── core/
│   └── client.ts           # HTTP client with axios instances
├── interfaces/             # TypeScript type definitions (Entity, Comment, User,
│                           #   Collection, Connection, Follow, Report, Space, …)
├── modules/
│   ├── entities/           # client.entities
│   ├── events/             # client.events
│   ├── comments/           # client.comments
│   ├── users/              # client.users (incl. nested follow/connection actions)
│   ├── spaces/             # client.spaces
│   ├── search/             # client.search
│   ├── auth/               # client.auth
│   ├── hosted-apps/        # client.hostedApps
│   ├── collections/        # client.collections      (service-key userId)
│   ├── connections/        # client.connections      (service-key userId)
│   ├── follows/            # client.follows          (service-key userId)
│   ├── reports/            # client.reports          (service-key userId)
│   ├── app-notifications/  # client.appNotifications (service-key userId)
│   ├── storage/            # client.storage          (service-key userId)
│   ├── push/               # client.push             (service-key userIds batch)
│   └── chat/               # client.chat             (service-key userId / actingUserId)
└── index.ts                # Main entry point with SublayClient class
```

> **Not bound (unmounted):** `oauth` only. It's a browser redirect flow with no
> meaningful server-to-server contract — the directory stays on disk but is not
> exposed on `SublayClient`.
>
> The space-scoped chat endpoints (`getSpaceConversation`, `moderateSpaceChatMessage`,
> `handleSpaceChatReport`) live on **`client.spaces`** (they're `/spaces/...` routes),
> not on `client.chat`.

### HTTP Client Configuration

The SDK uses three axios instances for different API endpoints:

- **projectInstance**: `https://api.sublay.io/v7/{projectId}` - Main project-scoped API
- **internalInstance**: `https://api.sublay.io/internal` - Internal operations (verification, admin)
- **baseInstance**: `https://api.sublay.io` - Base API endpoint

**Authentication Headers**:
- `Authorization: Bearer {apiKey}`
- `X-Sublay-Project-ID: {projectId}`
- `X-Sublay-Internal: true` (for internal operations)

### Initialization Pattern

```typescript
import { SublayClient } from '@sublay/node';

const client = await SublayClient.init({
    projectId: "your-project-id",
    apiKey: "your-api-key",
    isInternal?: boolean  // optional
});

// Automatically verifies credentials on init via /service/verify endpoint
```

## API Modules & Features

`SublayClient` binds **15 modules**. The source of truth is `src/index.ts` (the `bindModule` calls) and each module's `index.ts`. The full public surface and per-function props/returns are documented in `docs/v7/node-sdk/`.

**Acting on behalf of a user**: the SDK authenticates as the project (service key), not as an end user. So user-scoped functions take an explicit `userId` — the user the operation is performed as. A few routes act on one user *toward another* and take the actor as `actingUserId` while `userId` is the target: the nested follow/connection routes on the `users` module, and `chat.createDirectConversation` / `chat.addMember` / `chat.removeMember` / `chat.changeMemberRole`.

**Intentionally NOT bound**: `oauth` only (a browser redirect flow). The directory exists under `src/modules/` but is not exposed on `SublayClient`; do not document it.

### 1. Entities Module (16 functions)

Core content objects (posts, articles, products, listings, etc.).

`createEntity`, `fetchEntity`, `fetchEntityByForeignId`, `fetchEntityByShortId`, `fetchManyEntities`, `updateEntity`, `incrementEntityViews`, `deleteEntity`, `fetchDrafts`, `publishDraft`, `fetchTopComment`, `addReaction`, `removeReaction`, `fetchReactions`, `getUserReaction`, `isEntitySaved`

`fetchManyEntities` supports rich filtering via object-shaped filters: `keywordsFilters`, `metadataFilters` (`includes`/`includesAny`/`doesNotInclude`/`exists`/`doesNotExist`), `titleFilters`, `contentFilters`, `attachmentsFilters`, `locationFilters`; plus `sortBy` (new/hot/top/controversial or `metadata.<prop>`), `sortDir`, `sortType`, `sortByReaction`, `timeFrame`, `userId`/`followedOnly`, `include`, pagination.

### 2. Events Module (14 functions)

Event lifecycle, RSVPs, hosts, and invites.

`createEvent`, `fetchEvent`, `fetchManyEvents`, `updateEvent`, `cancelEvent`, `deleteEvent`, `setRsvp`, `withdrawRsvp`, `addHost`, `removeHost`, `addInvite`, `removeInvite`, `fetchInvitees`, `fetchEventRsvps`

`EventType` is `online`/`physical`/`hybrid`; `EventVisibility` is `public`/`members`/`invite`; `RsvpStatus` is `going`/`maybe`/`not_going`. `fetchManyEvents` filters: `timeWindow` (upcoming/ongoing/past) or an explicit `startsAfter`/`startsBefore` range, `spaceId`, `hostId`, `type`, `status` (defaults to `active`), `myRsvp` (requires `userId`), `locationFilters`, `titleFilters`/`descriptionFilters`. `fetchInvitees` (the guest list) is host-only; `fetchEventRsvps` is visible to hosts, to any viewer when `guestListVisible` is true, or to service/master keys.

### 3. Comments Module (10 functions)

`createComment`, `fetchComment`, `fetchCommentByForeignId`, `updateComment`, `deleteComment`, `fetchManyComments`, `addReaction`, `removeReaction`, `fetchReactions`, `getUserReaction`

Threaded replies (`parentId`), quote-replies (`referencedCommentId`), GIFs, mentions, reactions, foreign IDs, soft deletes. `fetchManyComments` sorts by `sortBy` (new/old/top/controversial).

### 4. Users Module (18 functions)

Read/update profiles and query + act on the follow/connection graph.

Profiles: `fetchUserById`, `fetchUserByForeignId`, `fetchUserByUsername`, `fetchUserSuggestions`, `checkUsernameAvailability`, `updateUser`

Graph queries (by target user ID): `fetchFollowersByUserId`, `fetchFollowersCountByUserId`, `fetchFollowingByUserId`, `fetchFollowingCountByUserId`, `fetchConnectionsByUserId`, `fetchConnectionsCountByUserId`

Graph actions (nested routes, take `actingUserId` + path `userId`): `createFollow`, `deleteFollow`, `fetchFollowStatus`, `requestConnection`, `fetchConnectionStatus`, `removeConnectionByUserId`

### 5. Collections Module (8 functions)

A user's saved-content collections (replaces the old "lists"). All take `userId`.

`fetchRootCollection`, `fetchSubCollections`, `createNewCollection`, `fetchCollectionEntities`, `addEntityToCollection`, `removeEntityFromCollection`, `updateCollection`, `deleteCollection`

### 6. Follows Module (5 functions)

Read a user's follow graph and remove follows by record ID. All take `userId`.

`fetchFollowing`, `fetchFollowers`, `fetchFollowingCount`, `fetchFollowersCount`, `deleteFollow`

### 7. Connections Module (7 functions)

A user's mutual connections and pending requests. All take `userId`.

`fetchConnections`, `fetchConnectionsCount`, `fetchSentPendingConnections`, `fetchReceivedPendingConnections`, `acceptConnection`, `declineConnection`, `removeConnection`

### 8. Spaces Module (31 functions)

Space lifecycle, membership, moderation, and rules — documented across three pages (`spaces`, `spaces-members`, `spaces-moderation`).

Lifecycle: `createSpace`, `fetchManySpaces`, `fetchSpace`, `fetchSpaceByShortId`, `fetchSpaceBySlug`, `fetchUserSpaces`, `checkSlugAvailability`, `updateSpace`, `deleteSpace`, `fetchChildSpaces`, `fetchSpaceBreadcrumb`

Members: `joinSpace`, `leaveSpace`, `checkMyMembership`, `fetchSpaceMembers`, `fetchSpaceTeam`, `updateMemberRole`, `approveMembership`, `declineMembership`, `banMember`, `unbanMember`

Moderation/rules: `handleEntityReport`, `handleCommentReport` (both take an `actions` array), `moderateSpaceEntity`, `moderateSpaceComment`, `fetchManyRules`, `fetchRule`, `createRule`, `updateRule`, `deleteRule`, `reorderRules`

### 9. Search Module (4 functions)

`searchContent`, `searchUsers`, `searchSpaces`, `askContent` (AI Q&A). Content/ask take `query`, `sourceTypes`, `spaceId`, `conversationId`, `limit`.

### 10. Reports Module (2 functions)

`createReport` (reporter is `userId`), `fetchModeratedReports` (moderator is `userId`). `ReportStatus`: `pending` | `on-hold` | `escalated` | `dismissed` | `actioned`.

### 11. App Notifications Module (4 functions)

`fetchNotifications`, `countUnreadNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`. All take `userId`.

### 12. Auth Module (10 functions)

`signUp`, `signIn`, `signOut`, `requestNewAccessToken`, `verifyExternalUser`, `requestPasswordReset`, `resetPassword`, `verifyEmail`, `sendVerificationEmail`, `changePassword`

### 13. Hosted Apps Module (1 function)

`fetchHostedApp` — fetches hosted app configuration (uses the internal axios instance).

### 14. Storage Module (4 functions)

File and image uploads, plus read/delete. `uploadFile`, `uploadImage`, `getFile`, `deleteFile`.

- **Uploads** are multipart (`FormData`); `file` accepts a `Uint8Array` or `Blob`. Content-Type is left
  to axios so the multipart boundary is set correctly — do not hand-set it.
- **`uploadFile`** requires `pathParts` (string[]); optional `position`, `metadata`, one of
  `entityId`/`commentId`/`spaceId`, and `userId` (attribution; omit for a backend/project-owned file).
- **`uploadImage`** takes `imageOptions` — a discriminated union on `mode` (`exact-dimensions`,
  `aspect-ratio-width-based`, `aspect-ratio-height-based`, `original-aspect`, `multi-aspect-ratio`),
  mirroring the server schema (see `interfaces/ImageProcessing.ts`); plus optional `pathParts`, one
  association, and `userId`. (No `metadata`/`position` — the image schema doesn't read them.)
- **Access model:** reads (`getFile`) are project-scoped (any caller in the project); **delete is
  owner-or-service** — a user token may only delete files it owns, service/master keys may delete any.
  Both enforced server-side in `server/src/{v7,v7-schema}/controllers/storage/`.

### 15. Chat Module (20 functions)

Conversations, messages, members, reactions, read state, and reporting.

Conversations: `listConversations`, `createDirectConversation`, `createGroupConversation`, `getConversation`, `updateConversation`, `deleteConversation`, `getUnreadCount`
Members: `listMembers`, `addMember`, `removeMember`, `changeMemberRole`, `leaveConversation`
Messages: `listMessages`, `sendMessage`, `getMessage`, `editMessage`, `deleteMessage`
(Reporting a message is not a chat fn — use `reports.createReport` with `targetType: "message"`.)
Reactions: `toggleReaction`, `listReactions` · Read state: `markAsRead`

- **Acting user — resolve-then-check.** Every call takes the acting user (`userId`,
  or `actingUserId` where `userId` is the target: `createDirectConversation`,
  `addMember`, `removeMember`, `changeMemberRole`). The server resolves that user,
  then runs the normal membership/role checks against them — so you can only act as
  a genuine member, and admin ops require that user to be a group admin. This is
  stricter than `spaces` (which bypasses the check entirely for service keys).
- **Cursor pagination.** `listConversations` (`cursor`/`cursorCreatedAt`) and
  `listMessages` (`before`/`after`) return raw arrays + `hasMore`, **not** the
  `PaginatedResponse` envelope. `listMembers` uses offset (`PaginatedResponse`).
- **`sendMessage` is multipart when `files` are attached** (object fields
  JSON-stringified, like `storage`); otherwise a JSON body. Don't hand-set
  Content-Type.
- **Space chat lives on `client.spaces`:** `getSpaceConversation`,
  `moderateSpaceChatMessage`, `handleSpaceChatReport`. The two moderation routes
  are service-key god-mode (space-moderator check bypassed); their `actingUserId`
  is attribution-only. See `plan-chat-node-sdk-parity.md` at the engine root.

### 16. Push Notifications Module (1 function)

`send` — `{ userIds: string[], title: string, body: string, data?: Record<string, any> }`
plus optional rich-payload fields, each mapped to whichever platform(s) support
it and ignored elsewhere: `sound`, `badge` (iOS), `channelId` (Android),
`priority` (`high`/`normal`), `subtitle` (iOS), `imageUrl`, `tag`, `collapseId`,
`threadId` (iOS), `ttl` (seconds), `mutableContent` (iOS). `imageUrl` works
out-of-the-box on Android/Web; on iOS it also needs a Notification Service
Extension in the app (and auto-sets `mutable-content`). Android sound on 8+ is
owned by the channel, so pair `sound` with a client-created `channelId`. The
SDK forwards the whole body unreshaped — the server zod schema
(`server/src/v7/validation/push-notifications/push-notifications.schema.ts`) is
the source of truth.
Fans a push out across all of the listed users' registered devices (APNs/FCM/Web
Push); returns per-user, per-device results (`{ results: { [userId]: { platform, success, reason? }[] } }`).
Devices for a user with no registered devices come back as an empty array, not
omitted. Capped at 100 `userIds` per call.

## Key Design Patterns

### 1. Foreign ID Integration
All major resources support foreign IDs, allowing you to map your existing system's IDs to Sublay IDs. This enables seamless integration on top of existing platforms.

### 2. Metadata Flexibility
Most resources support custom metadata (10KB limit) for storing project-specific data without modifying the core schema.

### 3. Geo-Location Support
Entities and users support geo-location data in GeoJSON Point format for location-based features and filtering.

### 4. Soft Deletes
Resources use `deletedAt` timestamps rather than hard deletes, preserving data integrity and allowing for recovery.

### 5. Module Binding
Functions are bound to the HTTP client instance at initialization, providing a clean API: `client.entities.createEntity(data)` instead of passing the client explicitly.

## Usage Example

```typescript
import { SublayClient } from '@sublay/node';

// Initialize client
const client = await SublayClient.init({
    projectId: process.env.SUBLAY_PROJECT_ID,
    apiKey: process.env.SUBLAY_API_KEY
});

// Create an entity
const entity = await client.entities.createEntity({
    foreignId: 'post-123',
    title: 'My First Post',
    content: 'This is the content of my post',
    keywords: ['tutorial', 'nodejs'],
    userId: 'user-456',
    metadata: {
        category: 'technology',
        featured: true
    }
});

// Fetch entities with advanced filtering
const trendingPosts = await client.entities.fetchManyEntities({
    sortBy: 'hot',
    timeFrame: 'week',
    keywordsFilters: { includes: ['nodejs'] },
    limit: 10,
    page: 1
});

// Create a comment
const comment = await client.comments.createComment({
    entityId: entity.id,
    userId: 'user-789',
    content: 'Great post! Thanks for sharing.'
});

// Fetch user
const user = await client.users.fetchUserById({
    userId: 'user-456'
});
```

## Build & Publishing

### Build Configuration
- **Build Tool**: tsup
- **Output Formats**: CommonJS and ESM (dual package)
- **Type Declarations**: Generated via TypeScript compiler
- **Target**: ESNext
- **Entry Point**: `src/index.ts`

### Output Structure
```
dist/
├── index.js         # Main CommonJS/ESM bundle
└── index.d.ts       # TypeScript declarations
```

### Publishing to npm
```bash
# Beta release
pnpm publish-beta

# Production release
pnpm publish-prod
```

**Package Exports**:
- CommonJS: `dist/index.js`
- ES Modules: `dist/index.js`
- Types: `dist/index.d.ts`

## Use Cases

This SDK is ideal for:

1. **Server-Side Rendering** - Next.js server actions, server components
2. **Backend APIs** - Express, Fastify, Koa backend services
3. **Scheduled Jobs** - Cron jobs, background workers, task queues
4. **CLI Tools** - Command-line utilities for content management
5. **Migration Scripts** - Bulk data operations and imports
6. **Webhooks** - Event handlers for external integrations
7. **Admin Tools** - Moderation dashboards, content management
8. **Edge Functions** - Cloudflare Workers, Vercel Edge Functions

Essentially any Node.js environment where you need to interact with Sublay's social features without a React frontend.

## Technical Details

- **TypeScript**: Strict mode enabled
- **Dependencies**: Only axios for HTTP requests
- **API Version**: Uses v7 API endpoints
- **Authentication**: Bearer token with project ID header
- **Error Handling**: Axios error responses
- **Type Safety**: Full TypeScript support with exported interfaces

## Important Notes

- This SDK is on **v7** (v7.0.0)
- Requires valid project ID and API key from Sublay dashboard
- Credentials are verified on initialization
- All API calls are project-scoped
- Rate limiting applies based on your Sublay plan
