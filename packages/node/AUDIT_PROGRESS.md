# Node SDK Audit — Progress & Handoff

**Goal**: Audit and clean up `node-sdk/` so it only exposes endpoints that actually work with a service key. Working module by module through `SERVER_ENDPOINTS.md`.

---

## What's Been Done

### node-sdk — Modules Unmounted
Files kept in place for future re-enablement. Removed from `src/index.ts` (import, property declaration, and `bindModule` call):

- `appNotifications` — all endpoints require user identity
- `chat` — all endpoints require user identity (path mismatch on `markAsRead` also fixed in the SDK file)
- `connections` — all endpoints require user identity
- `follows` — all endpoints require user identity
- `reports` — all endpoints require user identity

### node-sdk — Auth Module Partial Cleanup
Removed from `src/modules/auth/index.ts` and deleted:

- `changePassword` — requires user identity
- `sendVerificationEmail` — requires user identity

### server — Reaction Endpoints Made Service-Key-Compatible
Updated controllers, validation schemas, and routers for both `comments` and `entities`:

- `addReaction` (POST `/:id/reactions`) — already had the pattern, cleaned up
- `removeReaction` (DELETE `/:id/reactions`) — updated controller + added body schema with optional `userId`
- `getUserReaction` (GET `/:id/reactions/me`) — updated controller + added query schema with optional `userId`

All 6 endpoints now marked as `can access with a key` / `yes` in `SERVER_ENDPOINTS.md`.

### server — Two Entity Endpoints Made Service-Key-Compatible
- `fetchDrafts` (GET `/entities/drafts`) — accepts `userId` from query
- `isEntitySaved` (GET `/entities/is-entity-saved`) — accepts `userId` from query

Both updated in validation schema (`entities.schema.ts`), controller, and `SERVER_ENDPOINTS.md`.

### server — New Helper: `resolveUserId`
**File**: `src/helpers/resolveUserId.ts`

Replaces the repeated inline userId resolution pattern across controllers. Returns a discriminated union:
- `{ userId: string | null, unauthorized: false }` — normal case
- `{ userId: null, unauthorized: true }` — logged-in user supplied a *different* userId (defensive 403)

**Usage pattern in controllers**:
```typescript
const resolved = resolveUserId(req, userIdProp);
if (resolved.unauthorized) {
  res.status(403).json({ error: "Unauthorized", code: "xxx/unauthorized" });
  return;
}
const userId = resolved.userId;
if (!userId) {
  res.status(400).json({ error: "Missing user ID", code: "xxx/missing-user-id" });
  return;
}
```

Applied to 9 controllers: `comments/createComment`, `comments/addReaction`, `comments/removeReaction`, `comments/getUserReaction`, `entities/addReaction`, `entities/removeReaction`, `entities/getUserReaction`, `entities/fetchDrafts`, `entities/isEntitySaved`.

**Note**: Do NOT use this helper in `entities/createEntity` — that controller has intentionally different logic (optional userId, `excludeUserId` flag, `requireUser` flag).

---

### server — Spaces Module Made Service-Key-Compatible

**`requireSpacePermission` middleware** (`server/src/middleware/requireSpacePermission.ts`):
All three middlewares (`requireSpaceAdmin`, `requireSpaceModerator`, `requireSpaceMember`) now bypass role checks for service/master keys. They still fetch and validate the space (404 handling), set `req.space`, and attach a super-admin `req.spacePermission`.

**New validation schemas** (`server/src/validation/spaces/space.schema.ts`):
- `joinSpaceBodySchema` — optional `userId`
- `leaveSpaceQuerySchema` — optional `userId`
- `checkMyMembershipQuerySchema` — optional `userId`
- `createSpaceBodySchema` — added optional `userId`
- `fetchUserSpacesQuerySchema` — added optional `userId`

**Controllers updated** (`server/src/v7/controllers/spaces/`):
- `createSpace` — `resolveUserId` from body; parent admin check bypassed for service key
- `fetchUserSpaces` — `resolveUserId` from query; 400 if userId missing
- `deleteSpace` — creator check bypassed for service key
- `joinSpace` — `resolveUserId` from body; 400 if userId missing
- `checkMyMembership` — `resolveUserId` from query; 400 if service key without userId
- `leaveSpace` — `resolveUserId` from query; 400 if userId missing
- `updateMemberRole` — creator check (`isSpaceCreator`) bypassed for service key
- `banMember` — creator check bypassed for service key
- `updateSpace` — `req.userId!` → `req.userId ?? null` for webhook `initiatorId`

**node-sdk — Spaces Module Partial Cleanup**:
- `getSpaceConversation` — removed and deleted (chat is inherently user-session-centric)
- `createSpace` — added `userId: string` to props (required; server keeps it optional for user-auth clients)
- `joinSpace` — added `userId: string`; sends in body
- `leaveSpace` — added `userId: string`; sends as query param
- `checkMyMembership` — added `userId: string`; sends as query param
- `fetchUserSpaces` — changed `userId?: string` → `userId: string` (was already passed as query param but ignored by server; server now reads it)

### node-sdk — Users Module Partial Cleanup
Removed from `src/modules/users/index.ts` and deleted:

- `createFollow` — requires user identity
- `fetchFollowStatus` — requires user identity
- `deleteFollow` — requires user identity
- `requestConnection` — requires user identity
- `fetchConnectionStatus` — requires user identity
- `removeConnectionByUserId` — requires user identity

Remaining 12 functions are all valid for service-key use.

### node-sdk — Storage Module Unmounted
All 4 endpoints require user identity. OAuth is a browser-only flow with no server-side use case.
Files kept in place for future re-enablement. Removed from `src/index.ts`.

### node-sdk — OAuth Module Unmounted
`authorize` is a browser redirect flow; `linkIdentity`, `listIdentities`, `unlinkIdentity` all require user identity. No meaningful server-side use case.
Files kept in place for future re-enablement. Removed from `src/index.ts`.

---

### node-sdk — Collections Module Unmounted
All endpoints require user identity. Files kept in place for future re-enablement. Removed from `src/index.ts`.

---

## Still To Do

*(none — all modules reviewed)*

### node-sdk — Modules Already Clean
- `auth` — done (two functions removed)
- `comments` — all remaining functions valid
- `entities` — all remaining functions valid
- `search` — all functions valid (all `no key needed`)
- `collections` — unmounted (all endpoints user-scoped)
- `hostedApps` — valid
- `oauth` — unmounted (browser-only flow)
- `spaces` — done (getSpaceConversation removed; userId wired up across 5 functions; server service-key support added)
- `storage` — unmounted (all endpoints user-scoped)
- `users` — done (6 follow/connection functions removed)
