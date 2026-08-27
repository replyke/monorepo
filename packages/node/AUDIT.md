# @sublay/node — Pre-Ship Audit

**Date**: 2026-04-16  
**Scope**: Full source review of `node-sdk/src/` before v7 release

---

## Summary

The SDK is structurally sound and significantly more complete than its CLAUDE.md suggests. Two modules (`follows`, `connections`) contain endpoints that are user-session-scoped and almost certainly non-functional with API key auth — the SDK's only auth mechanism. The `package.json` exports field has a TypeScript resolution bug. Everything else is minor.

---

## Issues by Priority

---

### 🔴 CRITICAL — Fix Before Shipping

#### 1. `follows` module calls user-session endpoints

**Files**: `src/modules/follows/`

All 5 endpoints in the `follows` module are user-context routes (no userId in path or params). They rely on the server inferring the user from a JWT — but the node SDK authenticates with an API key, not a user token.

| Function | Endpoint | Problem |
|---|---|---|
| `fetchFollowers` | `GET /follows/followers` | No userId — user-context only |
| `fetchFollowing` | `GET /follows/following` | No userId — user-context only |
| `fetchFollowersCount` | `GET /follows/followers-count` | No userId — user-context only |
| `fetchFollowingCount` | `GET /follows/following-count` | No userId — user-context only |
| `deleteFollow` | `DELETE /follows/{followId}` | Takes followId, not userId |

The `users` module already provides correct server-side equivalents:
- `fetchFollowersByUserId` → `/users/{userId}/followers`
- `fetchFollowingByUserId` → `/users/{userId}/following`
- `fetchFollowersCountByUserId` → `/users/{userId}/followers-count`
- `fetchFollowingCountByUserId` → `/users/{userId}/following-count`
- `deleteFollow` → `DELETE /users/{userId}/follow`

**Action**: Remove the `follows` module entirely. Its non-`userId`-scoped versions should not exist in a server SDK that has no user session context. The `users` module already covers all the same functionality correctly.

---

#### 2. `connections` module calls user-session endpoints

**Files**: `src/modules/connections/`

Same problem as `follows`. These endpoints expect a user JWT to identify "the current user":

| Function | Endpoint | Problem |
|---|---|---|
| `fetchConnections` | `GET /connections` | No userId — user-context only |
| `fetchConnectionsCount` | `GET /connections/count` | No userId — user-context only |
| `fetchSentPendingConnections` | `GET /connections/pending/sent` | No userId — user-context only |
| `fetchReceivedPendingConnections` | `GET /connections/pending/received` | No userId — user-context only |
| `acceptConnection` | Needs checking | Possibly requires user context |
| `declineConnection` | Needs checking | Possibly requires user context |
| `removeConnection` | Needs checking | Takes connectionId — may work with API key |

The `users` module covers the server-appropriate versions:
- `fetchConnectionsByUserId` → `/users/{userId}/connections`
- `fetchConnectionsCountByUserId` → `/users/{userId}/connections-count`
- `requestConnection` → `/users/{userId}/connections/request`
- `removeConnectionByUserId` → `/users/{userId}/connections`
- `fetchConnectionStatus` → `/users/{userId}/connections/status`

**Action**: Remove the `connections` module (or at minimum, verify each endpoint against the server). The `users` module already covers the server-side use cases.

---

#### 3. `package.json` exports field — TypeScript types unreachable

**File**: `package.json` lines 20–26

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.js",
    "types": "./dist/index.d.ts"   // ← comes last, never reached
  }
}
```

TypeScript resolves conditions in order. When `types` comes after `import`/`require`, TypeScript with `moduleResolution: node16`, `nodenext`, or `bundler` will never see it. This causes type resolution failures in modern TypeScript setups.

**Fix**: Move `types` first:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.js"
  }
}
```

---

### 🟡 SIGNIFICANT — Should Fix

#### 4. `baseInstance` is dead code

**File**: `src/core/client.ts` line 32–34

```typescript
this.baseInstance = axios.create({
  baseURL: "https://api.sublay.io",
});
```

This instance has no auth headers and is referenced on the class, but no module anywhere in `src/modules/` calls `client.baseInstance`. It appears to be a leftover from an earlier design.

**Action**: Remove it from `SublayHttpClient`.

---

#### 5. `CLAUDE.md` is severely outdated

**File**: `CLAUDE.md`

The file still describes the old structure:
- Claims "5 main API modules" — the SDK actually has **15 modules**
- Lists a `lists` module — it was renamed to `collections`
- Doesn't mention: `auth`, `oauth`, `chat`, `spaces`, `search`, `storage`, `reports`, `app-notifications`, `follows`, or `connections`
- States `baseURL: v5` in architecture section — the actual URL is `v7`

**Action**: Rewrite CLAUDE.md to reflect the actual current state.

---

### 🟠 DESIGN QUESTIONS — Discuss Before Shipping

#### 6. `auth` module — should it exist in a server SDK?

**File**: `src/modules/auth/`

The `auth` module has 10 functions. Several are legitimate in a server context:
- `signUp` — programmatic user creation ✅
- `verifyExternalUser` — **the primary server auth pattern** ✅
- `signIn` — useful in server-side auth proxy routes ✅
- `signOut` — invalidates a refresh token server-side ✅
- `requestPasswordReset` — triggers password reset email from server ✅
- `sendVerificationEmail` — triggers verification email from server ✅
- `requestNewAccessToken` — token refresh, useful in server middleware ✅

These are **borderline** — they require tokens that only exist in the user's email inbox:
- `resetPassword(token, newPassword)` — requires the link token from the reset email
- `verifyEmail(token)` — requires the link token from the verification email
- `changePassword(currentPassword, newPassword)` — requires the user's current password

**Question**: Do `resetPassword`, `verifyEmail`, and `changePassword` belong in the server SDK? A backend would have no reason to call these unless it's acting as an auth proxy. They're not harmful, but they may confuse developers who wonder if the server is supposed to hold onto email link tokens.

**Recommendation**: Keep them for completeness (they match the server API), but this is worth a discussion.

---

#### 7. `oauth` module — is it usable from a server?

**File**: `src/modules/oauth/`

The `oauth.authorize(provider, token)` function takes a provider name + token already obtained from the OAuth provider (typically acquired on the client via Google/GitHub SDK), then exchanges it with Sublay. This is a valid server-side OAuth backend exchange pattern — the client gets the token, sends it to your backend, your backend calls Sublay to authorize.

`linkIdentity`, `unlinkIdentity`, `listIdentities` are identity management operations that make sense in admin/server contexts.

**Verdict**: The OAuth module is appropriate for a server SDK. No issues.

---

### 🟢 MINOR

#### 8. `follows` module naming clash with `users` module

Both `client.follows.deleteFollow({ followId })` and `client.users.deleteFollow({ userId })` exist. These are different APIs — one deletes by the follow record ID, one deletes by the target user ID. The naming clash across two namespaces is confusing. This becomes moot if the `follows` module is removed (see Issue 1).

---

## What's Working Well

- Clean module binding pattern — no need to pass client everywhere
- `BoundModule<T>` generic is well-designed and type-safe
- All 15 modules are properly bound and exported
- TypeScript interfaces are comprehensive and consistent
- Consistent verb-first naming: `create*`, `fetch*`, `update*`, `delete*`
- `verifyClient()` on init gives fast failure on bad credentials
- Pagination interface is clean and used consistently
- Minimal dependencies (axios only)
- Dual CJS + ESM build via tsup

---

## Task List

| # | Task | Priority |
|---|---|---|
| 1 | Remove `follows` module from `src/modules/` and `src/index.ts` | 🔴 Critical |
| 2 | Remove `connections` module from `src/modules/` and `src/index.ts` (or verify endpoints work with API key) | 🔴 Critical |
| 3 | Fix `package.json` exports field — move `types` before `import`/`require` | 🔴 Critical |
| 4 | Remove `baseInstance` from `src/core/client.ts` | 🟡 Significant |
| 5 | Rewrite `CLAUDE.md` to reflect actual 15-module structure | 🟡 Significant |
| 6 | Decide: keep or remove `auth.resetPassword`, `auth.verifyEmail`, `auth.changePassword` | 🟠 Design call |
