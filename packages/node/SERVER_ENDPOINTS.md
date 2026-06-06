# Server V7 Endpoints — Service Key Access Reference

**Legend — Service Key Access:**
- `no key needed` — public endpoint, no auth required (works anonymously)
- `can access with a key` — service key bypasses user-auth middleware and the endpoint is meaningful without a specific user identity
- `can't access even with a key` — endpoint is inherently user-identity-dependent (relies on `req.userId` in controller logic; a service key bypasses the auth middleware but the operation itself requires a real user session)

**Legend — SDK Call Valid:**
- `yes` — SDK function exists and the call works correctly
- `no: needs user identity` — SDK function exists but the endpoint relies on `req.userId`; calling it from the SDK (which has no user session) will fail or return garbage
- `path mismatch` — SDK function exists but calls a different URL than the server exposes
- `—` — no SDK function exists for this endpoint

Base path: `/v7/:projectId/`

---

## Auth

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/auth/sign-up` | no key needed | `auth.signUp` | yes |
| POST | `/auth/sign-in` | no key needed | `auth.signIn` | yes |
| POST | `/auth/sign-out` | no key needed | `auth.signOut` | yes |
| POST | `/auth/change-password` | can access with a key | `auth.changePassword` | yes |
| POST | `/auth/request-password-reset` | no key needed | `auth.requestPasswordReset` | yes |
| POST | `/auth/reset-password` | no key needed | `auth.resetPassword` | yes |
| GET | `/auth/reset-password-page` | no key needed | — | — |
| POST | `/auth/request-new-access-token` | no key needed | `auth.requestNewAccessToken` | yes |
| POST | `/auth/verify-external-user` | no key needed | `auth.verifyExternalUser` | yes |
| POST | `/auth/send-verification-email` | can access with a key | `auth.sendVerificationEmail` | yes |
| POST | `/auth/verify-email` | no key needed | `auth.verifyEmail` | yes |
| GET | `/auth/verify-email-link` | no key needed | — | — |

---

## App Notifications


| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/app-notifications/` | can access with a key | `appNotifications.fetchNotifications` | yes |
| GET | `/app-notifications/count` | can access with a key | `appNotifications.countUnreadNotifications` | yes |
| PATCH | `/app-notifications/:notificationId/mark-as-read` | can access with a key | `appNotifications.markNotificationAsRead` | yes |
| PATCH | `/app-notifications/mark-all-as-read` | can access with a key | `appNotifications.markAllNotificationsAsRead` | yes |

---

## Chat — Conversations

> **SDK module unmounted** — all chat endpoints require user identity. Files kept for future re-enablement.

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/chat/conversations/` | can't access even with a key | `chat.listConversations` | no: needs user identity |
| POST | `/chat/conversations/` | can't access even with a key | `chat.createGroupConversation` | no: needs user identity |
| POST | `/chat/conversations/direct` | can't access even with a key | `chat.createDirectConversation` | no: needs user identity |
| GET | `/chat/conversations/unread-count` | can't access even with a key | `chat.getUnreadCount` | no: needs user identity |
| GET | `/chat/conversations/:conversationId` | can't access even with a key | `chat.getConversation` | no: needs user identity |
| PATCH | `/chat/conversations/:conversationId` | can't access even with a key | `chat.updateConversation` | no: needs user identity |
| DELETE | `/chat/conversations/:conversationId` | can't access even with a key | `chat.deleteConversation` | no: needs user identity |

## Chat — Members

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/chat/conversations/:conversationId/members` | can't access even with a key | `chat.listMembers` | no: needs user identity |
| POST | `/chat/conversations/:conversationId/members` | can't access even with a key | `chat.addMember` | no: needs user identity |
| DELETE | `/chat/conversations/:conversationId/members/:userId` | can't access even with a key | `chat.removeMember` | no: needs user identity |
| DELETE | `/chat/conversations/:conversationId/leave` | can't access even with a key | `chat.leaveConversation` | no: needs user identity |
| PATCH | `/chat/conversations/:conversationId/members/:userId/role` | can't access even with a key | `chat.changeMemberRole` | no: needs user identity |

## Chat — Messages

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/chat/conversations/:conversationId/messages` | can't access even with a key | `chat.listMessages` | no: needs user identity |
| POST | `/chat/conversations/:conversationId/messages` | can't access even with a key | `chat.sendMessage` | no: needs user identity |
| GET | `/chat/conversations/:conversationId/messages/:messageId` | can't access even with a key | `chat.getMessage` | no: needs user identity |
| PATCH | `/chat/conversations/:conversationId/messages/:messageId` | can't access even with a key | `chat.editMessage` | no: needs user identity |
| DELETE | `/chat/conversations/:conversationId/messages/:messageId` | can't access even with a key | `chat.deleteMessage` | no: needs user identity |

## Chat — Reactions

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/chat/conversations/:conversationId/messages/:messageId/reactions` | can't access even with a key | `chat.toggleReaction` | no: needs user identity |
| GET | `/chat/conversations/:conversationId/messages/:messageId/reactions` | can't access even with a key | `chat.listReactions` | no: needs user identity |

## Chat — Read State & Reports

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/chat/conversations/:conversationId/read` | can't access even with a key | `chat.markAsRead` | no: needs user identity |
| POST | `/chat/conversations/:conversationId/messages/:messageId/report` | can't access even with a key | — | — |

---

## Comments

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/comments/` | can access with a key | `comments.createComment` | yes |
| GET | `/comments/` | no key needed | `comments.fetchManyComments` | yes |
| GET | `/comments/by-foreign-id` | no key needed | `comments.fetchCommentByForeignId` | yes |
| GET | `/comments/:commentId` | no key needed | `comments.fetchComment` | yes |
| PATCH | `/comments/:commentId` | can access with a key | `comments.updateComment` | yes |
| POST | `/comments/:commentId/reactions` | can access with a key | `comments.addReaction` | yes |
| DELETE | `/comments/:commentId/reactions` | can access with a key | `comments.removeReaction` | yes |
| GET | `/comments/:commentId/reactions` | no key needed | `comments.fetchReactions` | yes |
| GET | `/comments/:commentId/reactions/me` | can access with a key | `comments.getUserReaction` | yes |
| DELETE | `/comments/:commentId` | can access with a key | `comments.deleteComment` | yes |

---

## Connections


| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/connections/` | can access with a key | `connections.fetchConnections` | yes |
| GET | `/connections/count` | can access with a key | `connections.fetchConnectionsCount` | yes |
| GET | `/connections/pending/sent` | can access with a key | `connections.fetchSentPendingConnections` | yes |
| GET | `/connections/pending/received` | can access with a key | `connections.fetchReceivedPendingConnections` | yes |
| PATCH | `/connections/:connectionId/accept` | can access with a key | `connections.acceptConnection` | yes |
| PATCH | `/connections/:connectionId/decline` | can access with a key | `connections.declineConnection` | yes |
| DELETE | `/connections/:connectionId` | can access with a key | `connections.removeConnection` | yes |

---

## Entities

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/entities/` | can access with a key | `entities.createEntity` | yes |
| GET | `/entities/` | no key needed | `entities.fetchManyEntities` | yes |
| GET | `/entities/by-foreign-id` | no key needed | `entities.fetchEntityByForeignId` | yes |
| GET | `/entities/by-short-id` | no key needed | `entities.fetchEntityByShortId` | yes |
| GET | `/entities/drafts` | can access with a key | `entities.fetchDrafts` | yes |
| GET | `/entities/is-entity-saved` | can access with a key | `entities.isEntitySaved` | yes |
| PATCH | `/entities/:entityId/publish` | can access with a key | `entities.publishDraft` | yes |
| GET | `/entities/:entityId` | no key needed | `entities.fetchEntity` | yes |
| GET | `/entities/:entityId/top-comment` | no key needed | `entities.fetchTopComment` | yes |
| POST | `/entities/:entityId/reactions` | can access with a key | `entities.addReaction` | yes |
| DELETE | `/entities/:entityId/reactions` | can access with a key | `entities.removeReaction` | yes |
| GET | `/entities/:entityId/reactions` | no key needed | `entities.fetchReactions` | yes |
| GET | `/entities/:entityId/reactions/me` | can access with a key | `entities.getUserReaction` | yes |
| PATCH | `/entities/:entityId/increment-views` | can access with a key *(requires service or master key — elevated auth enforced)* | `entities.incrementEntityViews` | yes |
| PATCH | `/entities/:entityId` | can access with a key | `entities.updateEntity` | yes |
| DELETE | `/entities/:entityId` | can access with a key | `entities.deleteEntity` | yes |

---

## Follows


| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/follows/following` | can access with a key | `follows.fetchFollowing` | yes |
| GET | `/follows/followers` | can access with a key | `follows.fetchFollowers` | yes |
| GET | `/follows/following-count` | can access with a key | `follows.fetchFollowingCount` | yes |
| GET | `/follows/followers-count` | can access with a key | `follows.fetchFollowersCount` | yes |
| DELETE | `/follows/:followId` | can access with a key | `follows.deleteFollow` | yes |

---

## Collections


| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/collections/:collectionId/sub-collections` | can access with a key | `collections.createNewCollection` | yes |
| GET | `/collections/root` | can access with a key | `collections.fetchRootCollection` | yes |
| GET | `/collections/:collectionId/sub-collections` | can access with a key | `collections.fetchSubCollections` | yes |
| GET | `/collections/:collectionId/entities` | can access with a key | `collections.fetchCollectionEntities` | yes |
| POST | `/collections/:collectionId/entities` | can access with a key | `collections.addEntityToCollection` | yes |
| DELETE | `/collections/:collectionId/entities/:entityId` | can access with a key | `collections.removeEntityFromCollection` | yes |
| PATCH | `/collections/:collectionId` | can access with a key | `collections.updateCollection` | yes |
| DELETE | `/collections/:collectionId` | can access with a key | `collections.deleteCollection` | yes |

---

## Reports


| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/reports/` | can access with a key | `reports.createReport` | yes |
| GET | `/reports/moderated` | can access with a key | `reports.fetchModeratedReports` | yes |

---

## Spaces

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/spaces/` | can access with a key | `spaces.createSpace` | yes |
| GET | `/spaces/` | no key needed | `spaces.fetchManySpaces` | yes |
| GET | `/spaces/check-slug` | no key needed | `spaces.checkSlugAvailability` | yes |
| GET | `/spaces/user-spaces` | can access with a key | `spaces.fetchUserSpaces` | yes |
| GET | `/spaces/by-short-id` | no key needed | `spaces.fetchSpaceByShortId` | yes |
| GET | `/spaces/by-slug` | no key needed | `spaces.fetchSpaceBySlug` | yes |
| GET | `/spaces/:spaceId` | no key needed | `spaces.fetchSpace` | yes |
| PATCH | `/spaces/:spaceId` | can access with a key | `spaces.updateSpace` | yes |
| DELETE | `/spaces/:spaceId` | can access with a key | `spaces.deleteSpace` | yes |
| GET | `/spaces/:spaceId/digest-config` | can access with a key | `spaces.fetchDigestConfig` | yes |
| PATCH | `/spaces/:spaceId/digest-config` | can access with a key | `spaces.updateDigestConfig` | yes |
| POST | `/spaces/:spaceId/join` | can access with a key | `spaces.joinSpace` | yes |
| GET | `/spaces/:spaceId/members` | no key needed | `spaces.fetchSpaceMembers` | yes |
| GET | `/spaces/:spaceId/team` | no key needed | `spaces.fetchSpaceTeam` | yes |
| GET | `/spaces/:spaceId/membership/me` | can access with a key | `spaces.checkMyMembership` | yes |
| PATCH | `/spaces/:spaceId/members/:memberId/role` | can access with a key | `spaces.updateMemberRole` | yes |
| PATCH | `/spaces/:spaceId/members/:memberId/approve` | can access with a key | `spaces.approveMembership` | yes |
| PATCH | `/spaces/:spaceId/members/:memberId/decline` | can access with a key | `spaces.declineMembership` | yes |
| PATCH | `/spaces/:spaceId/members/:memberId/ban` | can access with a key | `spaces.banMember` | yes |
| PATCH | `/spaces/:spaceId/members/:memberId/unban` | can access with a key | `spaces.unbanMember` | yes |
| DELETE | `/spaces/:spaceId/leave` | can access with a key | `spaces.leaveSpace` | yes |
| PATCH | `/spaces/:spaceId/reports/entity/:reportId` | can access with a key | `spaces.handleEntityReport` | yes |
| PATCH | `/spaces/:spaceId/reports/comment/:reportId` | can access with a key | `spaces.handleCommentReport` | yes |
| PATCH | `/spaces/:spaceId/entities/:entityId/moderation` | can access with a key | `spaces.moderateSpaceEntity` | yes |
| PATCH | `/spaces/:spaceId/comments/:commentId/moderation` | can access with a key | `spaces.moderateSpaceComment` | yes |
| GET | `/spaces/:spaceId/children` | no key needed | `spaces.fetchChildSpaces` | yes |
| GET | `/spaces/:spaceId/breadcrumb` | no key needed | `spaces.fetchSpaceBreadcrumb` | yes |
| GET | `/spaces/:spaceId/rules` | no key needed | `spaces.fetchManyRules` | yes |
| PATCH | `/spaces/:spaceId/rules/reorder` | can access with a key | `spaces.reorderRules` | yes |
| GET | `/spaces/:spaceId/rules/:ruleId` | no key needed | `spaces.fetchRule` | yes |
| POST | `/spaces/:spaceId/rules` | can access with a key | `spaces.createRule` | yes |
| PATCH | `/spaces/:spaceId/rules/:ruleId` | can access with a key | `spaces.updateRule` | yes |
| DELETE | `/spaces/:spaceId/rules/:ruleId` | can access with a key | `spaces.deleteRule` | yes |
| GET | `/spaces/:spaceId/conversation` | can't access even with a key | — | — |
| PATCH | `/spaces/:spaceId/chat/messages/:messageId/moderation` | can't access even with a key | — | — |
| PATCH | `/spaces/:spaceId/chat/reports/:reportId` | can't access even with a key | — | — |

---

## Users

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/users/suggestions` | no key needed | `users.fetchUserSuggestions` | yes |
| GET | `/users/check-username` | no key needed | `users.checkUsernameAvailability` | yes |
| GET | `/users/by-foreign-id` | no key needed | `users.fetchUserByForeignId` | yes |
| GET | `/users/by-username` | no key needed | `users.fetchUserByUsername` | yes |
| GET | `/users/:userId` | no key needed | `users.fetchUserById` | yes |
| PATCH | `/users/:userId` | can access with a key | `users.updateUser` | yes |
| POST | `/users/:userId/follow` | can access with a key | `users.createFollow` | yes |
| GET | `/users/:userId/follow` | can access with a key | `users.fetchFollowStatus` | yes |
| GET | `/users/:userId/followers` | no key needed | `users.fetchFollowersByUserId` | yes |
| GET | `/users/:userId/followers-count` | no key needed | `users.fetchFollowersCountByUserId` | yes |
| GET | `/users/:userId/following` | no key needed | `users.fetchFollowingByUserId` | yes |
| GET | `/users/:userId/following-count` | no key needed | `users.fetchFollowingCountByUserId` | yes |
| DELETE | `/users/:userId/follow` | can access with a key | `users.deleteFollow` | yes |
| POST | `/users/:userId/connection` | can access with a key | `users.requestConnection` | yes |
| GET | `/users/:userId/connection` | can access with a key | `users.fetchConnectionStatus` | yes |
| GET | `/users/:userId/connections` | no key needed | `users.fetchConnectionsByUserId` | yes |
| GET | `/users/:userId/connections-count` | no key needed | `users.fetchConnectionsCountByUserId` | yes |
| DELETE | `/users/:userId/connection` | can access with a key | `users.removeConnectionByUserId` | yes |

---

## Storage

> **SDK module unmounted** — all endpoints require user identity. Files kept for future re-enablement.

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/storage/images` | can't access even with a key | `storage.uploadImage` | no: needs user identity |
| POST | `/storage/` | can't access even with a key | `storage.uploadFile` | no: needs user identity |
| GET | `/storage/:fileId` | can't access even with a key | `storage.getFile` | no: needs user identity |
| DELETE | `/storage/:fileId` | can't access even with a key | `storage.deleteFile` | no: needs user identity |

---

## Utils

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| GET | `/utils/get-metadata` | can't access even with a key | — | — |

---

## OAuth

> **SDK module unmounted** — OAuth is a browser-based redirect flow with no server-side use case. Files kept for future re-enablement.

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/oauth/authorize` | no key needed | `oauth.authorize` | yes |
| POST | `/oauth/link` | can't access even with a key | `oauth.linkIdentity` | no: needs user identity |
| GET | `/oauth/identities` | can't access even with a key | `oauth.listIdentities` | no: needs user identity |
| DELETE | `/oauth/identities/:identityId` | can't access even with a key | `oauth.unlinkIdentity` | no: needs user identity |
| GET/POST | `/v7/oauth/callback` *(app-level, no projectId)* | no key needed | — | — |

---

## Search

| Method | Path | Service Key Access | SDK Function | SDK Call Valid |
|--------|------|--------------------|--------------|----------------|
| POST | `/search/content` | no key needed | `search.searchContent` | yes |
| POST | `/search/users` | no key needed | `search.searchUsers` | yes |
| POST | `/search/spaces` | no key needed | `search.searchSpaces` | yes |
| POST | `/search/ask` | no key needed | `search.askContent` | yes |

---

## How Service Key Auth Works

- Service keys are sent as `Authorization: Bearer <key>` with an `x-sublay-project-id` header.
- The `flagServiceAccess` middleware validates the key against a hashed key stored in `ProjectApiKey`. If valid, it sets `req.isService = true`.
- The `requireUserAuth` middleware checks `if (req.isMaster || req.isService)` first — so a valid service key bypasses JWT validation on any user-auth-guarded endpoint at the middleware level.
- `requireElevatedAuth` (used only on `increment-views`) explicitly requires `req.isService` or `req.isMaster` and returns 403 otherwise — it is the only endpoint that actively enforces a service key.
- Endpoints marked `can't access even with a key` will pass the auth middleware with a service key, but their controller logic depends on `req.userId` (the caller's user identity), which a service key does not provide, making the operation meaningless or broken in practice.

## Known Issues

- None currently.
