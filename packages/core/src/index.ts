// Helpers & Utilities
export {
  handleError,
  setSublayLogLevel,
  getSublayLogLevel,
  type SublayLogLevel,
} from "./utils/handleError";
export {
  SuspendedError,
  isSuspendedError,
  SUSPENDED_ERROR_CODE,
} from "./errors/SuspendedError";
export { keywordHelpers } from "./utils/keywordHelpers";
export { safeMergeStyleProps } from "./helpers/safeMergeStyleProps";
export { getUserName } from "./helpers/getUserName";
export { default as getPublicFileUrl } from "./helpers/getPublicFileUrl";
export {
  isDevelopment,
  isProduction,
  getApiBaseUrl,
  getEnvVar,
} from "./utils/env";
export {
  buildSpaceReputationParams,
  type BuildSpaceReputationParamsInput,
  type SpaceReputationFlatParams,
} from "./utils/spaceReputationParams";

// Constants
export { reportReasons } from "./constants/reportReasons";
export type { ReportReasonKey } from "./constants/reportReasons";

// Context providers (Redux-powered by default)
export {
  SublayProvider,
  SublayIntegrationProvider,
  EntityProvider,
  EventProvider,
  CommentSectionProvider,
  SpaceProvider,
  ChatProvider,
  ConversationProvider,
  MessageThreadProvider,
  useChatContext,
  useConversationContext,
  useMessageThreadContext,
  type ChatContextValue,
  type ChatProviderProps,
  type ConversationContextValue,
  type ConversationProviderProps,
  type MessageThreadContextValue,
  type MessageThreadProviderProps,
} from "./context";

// Integration mode exports (for users with their own Redux store)
export {
  sublayReducers,
  sublayApiReducer,
  sublayMiddleware,
  sublayApi,
  type SublayState,
} from "./store/integration";

// -- projects
export { useProject, useProjectData } from "./hooks/projects";

// -- crypto
export { useSignTestingJwt, type SignTestingJwtProps } from "./hooks/crypto";

// -- authentication
export {
  useAuth,
  useRequestPasswordReset,
  useSendVerificationEmail,
  useVerifyEmail,
  useRequestAccountDeletion,
  useConfirmAccountDeletion,
  type UseAuthValues,
  type SignUpWithEmailAndPasswordProps,
  type SignInWithEmailAndPasswordProps,
  type ChangePasswordProps,
  type SetPasswordProps,
  type RequestPasswordResetProps,
  type SendVerificationEmailProps,
  type VerifyEmailProps,
  type ConfirmAccountDeletionProps,
} from "./hooks/auth";

// -- authentication (accounts)
export {
  useAccountSync,
  useAccounts,
  useSwitchAccount,
  useAddAccount,
  useRemoveAccount,
  useSignOutAll,
  type UseAccountsReturn,
  type StoredAccount,
  type UseSwitchAccountReturn,
  type UseAddAccountReturn,
  type UseRemoveAccountReturn,
  type UseSignOutAllReturn,
} from "./hooks/auth";

// -- authentication (OAuth)
export {
  useOAuthIdentities,
  type OAuthIdentity,
  type UseOAuthIdentitiesReturn,
} from "./hooks/auth";

// -- authentication (OAuth shared helpers — consumed by platform hooks)
export {
  OAUTH_BASE_URL,
  requestOAuthAuthorizationUrl,
  parseOAuthRedirectUrl,
  handleOAuthRedirect,
  type OAuthRedirectParams,
  type HandleOAuthRedirectResult,
} from "./hooks/auth/oauthCore";

// -- store internals (for platform-specific hooks in react-js / react-native)
export { useSublayDispatch, useSublaySelector } from "./store/hooks";
export {
  setTokens,
  setInitialized,
  selectAccessToken,
} from "./store/slices/authSlice";
export { requestNewAccessTokenThunk } from "./store/slices/authThunks";

// -- the account cap
//
// The message `signUpWithEmailAndPassword`, `signInWithEmailAndPassword` and
// `verifyExternalUser` reject with once this device already holds
// `MAX_ACCOUNTS` accounts. Exported so an app can recognise the cap without
// string-matching a message it does not own. The two OAuth paths cannot reject
// their caller (their entry point is synchronous and shared by both platforms)
// and raise `accountLimitReached` instead — see `useAccounts`/`useAddAccount`.
export { ACCOUNT_LIMIT_MESSAGE } from "./store/slices/authThunks";

// -- account storage
export type { AccountStorage } from "./interfaces/AccountStorage";

// -- persisted-account validation (for the storage adapters in expo /
//    react-js / react-native), alongside the store internals above
//
// Not part of the app-facing surface. It is exported only because the three
// adapters live in separately published packages and consume core through its
// single entry point, so a module they can all import is the only way this
// logic exists once. An app has no persisted map to validate — core is the
// only writer — and these names carry no compatibility promise.
export {
  readStoredAccountEntry,
  readStoredDeviceIdentifier,
  readStoredMapFields,
  readStoredAccountMap,
  type StoredMapFields,
} from "./config/storedAccountMap";
export {
  MAX_ACCOUNTS,
  // `isAccountPushEnabled` is REPORTED STATE — what a per-account push switch
  // renders as `checked`, with an absent preference reading as enabled. It is
  // not the rule the SDK uses to decide whether to create a binding; that one
  // requires an explicit opt-in and is internal, so a binding is never created
  // for an account that has not asked for one.
  isAccountPushEnabled,
  accountNeedsReauth,
  accountNeedsPushRebind,
  selectAccounts,
  selectActiveAccountId,
  selectSignedOut,
  selectAccountLimitReached,
  selectDeviceIdentifier,
  type AccountSummary,
  type AccountEntry,
  type AccountMap,
} from "./store/slices/accountsSlice";

// -- account-transition primitives (R8)
//
// Composable pieces for integrators who drive their own account UI, WITHOUT
// re-exposing the footguns underneath. Deliberately absent:
//
//   - `setActiveAccount` — an unguarded assignment, so publishing it would make
//     "`activeAccountId` names a key that is not in `accounts`" a supported
//     public operation. That corrupt shape is precisely what this surface
//     exists to prevent.
//   - `upsertAccount` — the reducer that enforces the account cap.
//   - `removeAccount` — the bare reducer only mutates local state; dispatching
//     it drops an account without signing it out server-side or unbinding its
//     push. `useRemoveAccount` performs the whole flow and is the public
//     surface.
//
// `activateStoredAccount` is the validated equivalent of the first: it proves
// the stored account's credential out of band, and only then tears the current
// session down and selects the new one. There is no selection rollback, because
// a failure never changes the selection — it rejects with everything exactly as
// it was. It takes `getState` alongside `dispatch`: reading the target's stored
// entry and persisting the successor the exchange rotates into are both part of
// the sequence, and neither is reachable from `dispatch` alone.
export {
  activateStoredAccount,
  AccountTransitionError,
  ACCOUNT_TRANSITION_FAILED_MESSAGE,
  type ActivateStoredAccountArgs,
} from "./hooks/auth/accountTransition";
export { resetAccountScopedState } from "./store/actions";
export { resetAuth } from "./store/slices/authSlice";
export { clearUser } from "./store/slices/userSlice";
// `setSignedOut` completes that set. The other three clear the SESSION; none of
// them touches `accountsSlice`, so a hand-rolled teardown left `signedOut:
// false` with an account still selected — and the next launch read that as "the
// user has never picked an account", re-activated it and restored its refresh
// token. The app signed itself back in. Dispatch `setSignedOut(true)` to record
// that ending the session was deliberate; `setActiveAccount` clears it again on
// the next activation, so nothing has to unset it by hand.
//
// A plain boolean, with none of the corruption risk that keeps
// `setActiveAccount` unexported.
export { setSignedOut } from "./store/slices/accountsSlice";

// -- (current) user
export {
  useUser,
  useUserActions,
  type UseUserProps,
  type UseUserValues,
  type ActiveSuspension,
  type UpdateUserParams,
} from "./hooks/user";

// -- app notifications
export {
  useAppNotifications,
  useAppNotificationsActions,
  type UseAppNotificationsProps,
  type UseAppNotificationsValues,
} from "./hooks/app-notifications";

// -- push notifications
export {
  usePushRegistration,
  useNotificationPreferences,
  useAccountPushToggle,
  type UsePushRegistrationValues,
  type UseNotificationPreferencesValues,
  type UseAccountPushToggleValues,
  type SetAccountPushEnabledParams,
} from "./hooks/push";
export type {
  PushTokenAdapter,
  PushDeviceContext,
  PushDeviceIdentifier,
  PushDevicePlatform,
  PushWebSubscriptionPayload,
} from "./interfaces/PushTokenAdapter";
export { PUSH_EVENT_TYPES, type PushEventType } from "./interfaces/PushEventType";
export { MUTE_DURATIONS, type MuteDuration } from "./interfaces/MuteDuration";
export type {
  NotificationPreferencesResponse,
  MuteConversationResponse,
} from "./store/api/notificationPreferencesApi";

// -- collections
export {
  useCollections,
  useCollectionsActions,
  useCollectionEntitiesWrapper,
  type UseCollectionsProps,
  type UseCollectionsValues,
  type CreateCollectionProps,
  type UpdateCollectionProps,
  type DeleteCollectionProps,
  type AddToCollectionProps,
  type RemoveFromCollectionProps,
  type UseCollectionEntitiesWrapperProps,
  type UseCollectionEntitiesWrapperValues,
} from "./hooks/collections";

// -- entities
export {
  useEntity,
  useEntityData,
  useCreateEntity,
  useDeleteEntity,
  useFetchEntity,
  useFetchEntityByForeignId,
  useFetchEntityByShortId,
  useFetchManyEntities,
  useFetchManyEntitiesWrapper,
  useUpdateEntity,
  useFetchDrafts,
  usePublishDraft,
  useIsEntitySaved,
  type CreateEntityProps,
  type DeleteEntityProps,
  type FetchEntityProps,
  type FetchEntityByForeignIdProps,
  type FetchEntityByShortIdProps,
  type PublishDraftProps,
  type UseFetchManyEntitiesWrapperProps,
  type UseFetchManyEntitiesWrapperValues,
  type UseIsEntitySavedValues,
} from "./hooks/entities";

// -- events
export {
  useEvent,
  useEventData,
  useCreateEvent,
  useFetchEvent,
  useFetchManyEvents,
  useFetchManyEventsWrapper,
  useUpdateEvent,
  useDeleteEvent,
  useCancelEvent,
  useSetRsvp,
  useWithdrawRsvp,
  useAddHost,
  useRemoveHost,
  useAddInvite,
  useRemoveInvite,
  useFetchInvitees,
  useFetchEventRsvps,
  type UseEventDataProps,
  type UseEventDataValues,
  type CreateEventProps,
  type FetchEventProps,
  type FetchManyEventsProps,
  type UseFetchManyEventsWrapperProps,
  type UseFetchManyEventsWrapperValues,
  type EventTitleFilters,
  type EventDescriptionFilters,
  type EventLocationFilters,
  type UpdateEventProps,
  type DeleteEventProps,
  type CancelEventProps,
  type SetRsvpProps,
  type WithdrawRsvpProps,
  type AddHostProps,
  type RemoveHostProps,
  type AddInviteProps,
  type RemoveInviteProps,
  type FetchInviteesProps,
  type FetchEventRsvpsProps,
} from "./hooks/events";

// -- reputation
export {
  useCreateReputationGrant,
  useFetchManyReputationGrants,
  useFetchManyReputationGrantsWrapper,
  type CreateReputationGrantProps,
  type FetchManyReputationGrantsProps,
  type FetchManyReputationGrantsResponse,
  type UseFetchManyReputationGrantsWrapperProps,
  type UseFetchManyReputationGrantsWrapperValues,
} from "./hooks/reputation";

// -- entity lists
export {
  useEntityList,
  useEntityListActions,
  type UseEntityListProps,
  type UseEntityListValues,
  type EntityListCreateEntityProps,
  type EntityListDeleteEntityProps,
  type EntityListFilters,
  type EntityListSort,
  type EntityListConfig,
  type EntityListFetchOptions,
} from "./hooks/entity-lists";

// -- custom tables
export {
  useTable,
  type UseTableOptions,
  type UseTableValues,
} from "./hooks/tables";

// -- spaces
export {
  useSpace,
  useSpaceData,
  useFetchSpace,
  useFetchSpaceByShortId,
  useFetchSpaceBySlug,
  useFetchSpaceBreadcrumb,
  useFetchSpaceChildren,
  useFetchManySpaces,
  useCheckSlugAvailability,
  useCreateSpace,
  useUpdateSpace,
  useDeleteSpace,
  useJoinSpace,
  useLeaveSpace,
  useFetchSpaceMembers,
  useFetchSpaceTeam,
  useFetchUserSpaces,
  useFetchMutualSpaces,
  useUpdateMemberRole,
  useApproveMember,
  useDeclineMember,
  useBanMember,
  useUnbanMember,
  useModerateSpaceEntity,
  useModerateSpaceComment,
  useSetSpaceEntityNsfw,
  useSpacePermissions,
  useSpaceMentions,
  useCheckMyMembership,
  // Rule hooks
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useFetchRule,
  useFetchManyRules,
  useReorderRules,
  type UseSpaceDataProps,
  type UseSpaceDataValues,
  type FetchSpaceProps,
  type FetchSpaceByShortIdProps,
  type FetchSpaceBySlugProps,
  type FetchSpaceBreadcrumbProps,
  type FetchSpaceChildrenProps,
  type FetchManySpacesProps,
  type CheckSlugAvailabilityProps,
  type CreateSpaceProps,
  type UpdateSpaceProps,
  type DeleteSpaceProps,
  type JoinSpaceProps,
  type LeaveSpaceProps,
  type FetchSpaceMembersProps,
  type FetchSpaceTeamProps,
  type FetchUserSpacesProps,
  type FetchMutualSpacesProps,
  type CheckMyMembershipProps,
  type UpdateMemberRoleProps,
  type ApproveMemberProps,
  type DeclineMemberProps,
  type BanMemberProps,
  type UnbanMemberProps,
  type ModerateSpaceEntityProps,
  type ModerateSpaceCommentProps,
  type SetSpaceEntityNsfwProps,
  type UseSpacePermissionsProps,
  type UseSpacePermissionsValues,
  type UseSpaceMentionsProps,
  type UseSpaceMentionsValues,
  type CreateRuleProps,
  type UpdateRuleProps,
  type DeleteRuleProps,
  type FetchRuleProps,
  type FetchManyRulesProps,
  type ReorderRulesProps,
} from "./hooks/spaces";

// -- workspaces
export {
  useCreateWorkspace,
  useFetchWorkspace,
  useFetchManyWorkspaces,
  useFetchManyWorkspacesWrapper,
  useUpdateWorkspace,
  useUpdateWorkspaceInheritFlag,
  useDeleteWorkspace,
  useTransferWorkspaceOwnership,
  useFetchWorkspaceMembers,
  useFetchWorkspaceMemberStanding,
  useUpdateWorkspaceMember,
  useRemoveWorkspaceMember,
  useLeaveWorkspace,
  useRemoveWorkspaceMemberFromSubtree,
  useCreateWorkspaceInvite,
  useFetchWorkspaceInvites,
  useRevokeWorkspaceInvite,
  useResendWorkspaceInvite,
  useFetchMyWorkspaceInvites,
  useAcceptWorkspaceInvite,
  useDeclineWorkspaceInvite,
  useFetchWorkspaceAuthority,
  type CreateWorkspaceProps,
  type FetchWorkspaceProps,
  type FetchManyWorkspacesParams,
  type UseFetchManyWorkspacesWrapperProps,
  type UseFetchManyWorkspacesWrapperValues,
  type UpdateWorkspaceProps,
  type UpdateWorkspaceInheritFlagProps,
  type DeleteWorkspaceProps,
  type DeleteWorkspaceResponse,
  type TransferWorkspaceOwnershipProps,
  type FetchWorkspaceMembersProps,
  type FetchWorkspaceMemberStandingProps,
  type UpdateWorkspaceMemberProps,
  type RemoveWorkspaceMemberProps,
  type LeaveWorkspaceProps,
  type RemoveWorkspaceMemberFromSubtreeProps,
  type RemoveWorkspaceMemberFromSubtreeResponse,
  type SkippedWorkspace,
  type CreateWorkspaceInviteProps,
  type FetchWorkspaceInvitesProps,
  type FetchWorkspaceInvitesResponse,
  type RevokeWorkspaceInviteProps,
  type RevokeWorkspaceInviteResponse,
  type ResendWorkspaceInviteProps,
  type FetchMyWorkspaceInvitesResponse,
  type AcceptWorkspaceInviteProps,
  type AcceptWorkspaceInviteResponse,
  type DeclineWorkspaceInviteProps,
  type DeclineWorkspaceInviteResponse,
  type FetchWorkspaceAuthorityProps,
} from "./hooks/workspaces";

// -- space lists
export {
  useSpaceList,
  useSpaceListActions,
  type UseSpaceListProps,
  type UseSpaceListValues,
  type SpaceListCreateSpaceProps,
  type SpaceListDeleteSpaceProps,
  type FetchSpacesOptions,
  type CreateSpaceOptions,
  type DeleteSpaceOptions,
} from "./hooks/space-lists";

// -- comments
export {
  useCommentSection,
  useCommentSectionData,
  useCreateComment,
  useFetchManyComments,
  useFetchComment,
  useFetchCommentByForeignId,
  useReplies,
  useUpdateComment,
  useDeleteComment,
  useEntityComments,
  useFetchManyCommentsWrapper,
  type CommentSectionCreateCommentProps,
  type CommentSectionUpdateCommentProps,
  type CommentSectionDeleteCommentProps,
  type CreateCommentProps,
  type FetchManyCommentsProps,
  type FetchCommentProps,
  type FetchCommentByForeignIdProps,
  type UseRepliesProps,
  type UpdateCommentProps,
  type DeleteCommentProps,
  type UseFetchManyCommentsWrapperProps,
  type UseFetchManyCommentsWrapperValues,
  type MentionTriggers,
} from "./hooks/comments";

// -- reactions
export {
  useFetchEntityReactions,
  useFetchCommentReactions,
  useFetchEntityReactionsWrapper,
  useFetchCommentReactionsWrapper,
  useAddReaction,
  useRemoveReaction,
  useReactionToggle,
  type UseFetchEntityReactionsWrapperProps,
  type UseFetchEntityReactionsWrapperValues,
  type UseFetchCommentReactionsWrapperProps,
  type UseFetchCommentReactionsWrapperValues,
  type UseReactionToggleProps,
  type UseReactionToggleValues,
  type ToggleReactionProps,
  type AddReactionProps,
  type RemoveReactionProps,
  type FetchEntityReactionsProps,
  type FetchCommentReactionsProps,
} from "./hooks/reactions";

// -- users
export {
  useFetchUser,
  useFetchUserByForeignId,
  useFetchUserByUsername,
  useCheckUsernameAvailability,
  useFetchUserSuggestions,
  useUserMentions,
  type FetchUserProps,
  type FetchUserByForeignIdProps,
  type FetchUserByUsernameProps,
  type CheckUsernameAvailabilityProps,
  type FetchUserSuggestionsProps,
  type UseUserMentionsProps,
  type UseUserMentionsValues,
} from "./hooks/users";

// -- follows
export {
  useFetchFollowStatus,
  useFetchFollowers,
  useFetchFollowersByUserId,
  useFetchFollowersCount,
  useFetchFollowersCountByUserId,
  useFetchFollowing,
  useFetchFollowingByUserId,
  useFetchFollowingCount,
  useFetchFollowingCountByUserId,
  useFollowManager,
  useFollowUser,
  useUnfollowByFollowId,
  useUnfollowUserByUserId,
  type FollowUserProps,
  type UnfollowByFollowIdProps,
  type UnfollowUserByUserIdProps,
  type FetchFollowStatusProps,
  type FollowStatusResponse,
  type FollowerWithFollowInfo,
  type FetchFollowersParams,
  type FetchFollowersByUserIdParams,
  type FetchFollowersCountByUserIdProps,
  type FollowingWithFollowInfo,
  type FetchFollowingParams,
  type FetchFollowingByUserIdParams,
  type FetchFollowingCountByUserIdProps,
  type UseFollowToggleProps,
} from "./hooks/relationships/follows";

// -- connections
export {
  useRequestConnection,
  useAcceptConnection,
  useDeclineConnection,
  useRemoveConnection,
  useFetchConnections,
  useFetchConnectionStatus,
  useRemoveConnectionByUserId,
  useFetchConnectionsCount,
  useFetchSentPendingConnections,
  useFetchReceivedPendingConnections,
  useFetchConnectionsByUserId,
  useFetchConnectionsCountByUserId,
  useConnectionManager,
  type AcceptConnectionProps,
  type DeclineConnectionProps,
  type RemoveConnectionProps,
  type RemoveConnectionByUserIdProps,
  type FetchConnectionStatusProps,
  type FetchConnectionsParams,
  type FetchConnectionsByUserIdParams,
  type FetchConnectionsCountByUserIdParams,
  type FetchSentPendingConnectionsParams,
  type FetchReceivedPendingConnectionsParams,
  type UseConnectionManagerProps,
  type ConnectionData,
} from "./hooks/relationships/connections";

// -- blocks
export {
  useBlockUser,
  useUnblockUser,
  useFetchBlockStatus,
  useFetchBlockedUsers,
  useBlockManager,
  type BlockUserProps,
  type UnblockUserProps,
  type FetchBlockStatusProps,
  type BlockStatusResponse,
  type FetchBlockedUsersParams,
  type BlockedUser,
  type UseBlockManagerProps,
  type UseBlockManagerValues,
} from "./hooks/relationships/blocks";

// -- reports
export {
  useCreateReport,
  useFetchModeratedReports,
  useHandleSpaceEntityReport,
  useHandleSpaceCommentReport,
  useHandleSpaceChatReport,
  type UseCreateReportProps,
  type CreateReportProps,
  type CreateCommentReportProps,
  type CreateEntityReportProps,
  type CreateMessageReportProps,
  type ReportTargetType,
  type FetchModeratedReportsParams,
  type ReportUserReport,
  type Report,
  type HandleSpaceEntityReportParams,
  type HandleReportResponse,
  type HandleSpaceCommentReportParams,
  type HandleSpaceChatReportParams,
} from "./hooks/reports";

// -- general
export { useGetMetadata, type GetMetadataProps } from "./hooks/utils";
export type {
  UrlMetadata,
  UrlMetadataImage,
  UrlMetadataVideo,
  UrlMetadataAudio,
  UrlMetadataTwitter,
  UrlMetadataArticle,
  UrlMetadataAppLinks,
} from "./interfaces/UrlMetadata";

// -- search
export {
  useSearchContent,
  useSearchUsers,
  useSearchSpaces,
  useAskContent,
  useMatchUsers,
  type UseSearchContentProps,
  type UseSearchContentReturn,
  type ContentSearchResult,
  type UseSearchUsersProps,
  type UseSearchUsersReturn,
  type UserSearchResult,
  type UseSearchSpacesProps,
  type UseSearchSpacesReturn,
  type SpaceSearchResult,
  type UseAskContentProps,
  type UseAskContentReturn,
  type UseMatchUsersProps,
  type UseMatchUsersReturn,
  type UserMatchResult,
  type MatchedFacet,
  type MatchFacetRef,
  type SampleContent,
} from "./hooks/search";

// -- storage
export {
  useUploadFile,
  useUploadImage,
  type RNFile,
  type UploadFileOptions,
  type UploadResponse,
} from "./hooks/storage";

// Interfaces
export type {
  PaginatedResponse,
  PaginationMetadata,
} from "./interfaces/PaginatedResponse";
export type { EntityCommentsTree } from "./interfaces/EntityCommentsTree";
export type {
  UserFull,
  User,
  AuthUser,
  UserRole,
  UserInclude,
  UserIncludeArray,
  UserIncludeParam,
} from "./interfaces/models/User";
export * as AppNotification from "./interfaces/models/AppNotification";
export type {
  Entity,
  EntityInclude,
  EntityIncludeArray,
  EntityIncludeParam,
} from "./interfaces/models/Entity";
export type {
  Event,
  EventRsvp,
  EventInvite,
  EventType,
  EventVisibility,
  EventStatus,
  RsvpStatus,
  RsvpCounts,
} from "./interfaces/models/Event";
export type { Collection } from "./interfaces/models/Collection";
export type {
  ReputationGrant,
  ReputationGrantSourceType,
  ReputationGrantTargetType,
  ReputationGrantTargetFilter,
  NullableReputationGrantTargetFilter,
  GrantSummary,
} from "./interfaces/models/ReputationGrant";
export type {
  TableRow,
  TableQuery,
  DbFilter,
  DbFilterOperator,
} from "./interfaces/models/Table";
export type {
  Comment,
  GifData,
  CommentInclude,
  CommentIncludeArray,
  CommentIncludeParam,
} from "./interfaces/models/Comment";
export type {
  Reaction,
  ReactionType,
  ReactionCounts,
} from "./interfaces/models/Reaction";
export type {
  Mention,
  UserMention,
  SpaceMention,
} from "./interfaces/models/Mention";
export type {
  Space,
  SpaceDetailed,
  SpacePreview,
  SpaceMemberPermissions,
  ReadingPermission,
  PostingPermission,
  PaginationMeta,
  UserSpaceItem,
  UserSpacesResponse,
  JoinSpaceResponse,
  LeaveSpaceResponse,
  UpdateMemberRoleResponse,
  ApproveMemberResponse,
  DeclineMemberResponse,
  DeleteSpaceResponse,
  SpaceInclude,
  SpaceIncludeArray,
  SpaceIncludeParam,
} from "./interfaces/models/Space";
export type {
  Workspace,
  WorkspaceInvitation,
  WorkspaceCapability,
  WorkspaceInvitationStatus,
  WorkspaceAuthorityReason,
  WorkspaceAuthorityReasonDetail,
  WorkspaceInclude,
  WorkspaceIncludeArray,
  WorkspaceIncludeParam,
  WorkspaceRosterReason,
  WorkspaceRosterEntry,
  WorkspaceRosterResponse,
  WorkspaceRosterCountsResponse,
  WorkspaceMember,
  WorkspaceStandingUser,
  WorkspaceMemberStanding,
  WorkspaceAuthority,
} from "./interfaces/models/Workspace";
export type {
  SpaceMember,
  SpaceMemberRole,
  SpaceMemberStatus,
  SpaceMemberWithUser,
  SpaceMembersResponse,
  SpaceTeamResponse,
} from "./interfaces/models/SpaceMember";
export type { SpaceListSortByOptions } from "./interfaces/SpaceListSortByOptions";
// `SpaceListFilters` is exported from the slice, which is the definition
// `useSpaceList` actually accepts. A second, unused declaration used to live in
// `interfaces/SpaceListSortByOptions.ts` and was the one exported here — its
// shape (`search`, `visibility`) matched no real filter.
export type { SpaceListFilters } from "./store/slices/spaceListsSlice";
export type { SpaceBreadcrumb } from "./interfaces/SpaceBreadcrumb";
export type {
  SpaceReputationContextParams,
  SpaceReputationUserParams,
  SpaceReputationContextObject,
  SpaceReputationUserObject,
} from "./interfaces/SpaceReputation";
export type { UserSearchParams } from "./interfaces/UserSearch";
export type {
  Rule,
  FetchManyRulesResponse,
  DeleteRuleResponse,
} from "./interfaces/models/Rule";
export type { CommentsSortByOptions } from "./interfaces/CommentsSortByOptions";
export type {
  EntityListSortByOptions,
  SortByReaction,
  SortDirection,
  SortType,
} from "./interfaces/EntityListSortByOptions";
export {
  validateSortBy,
  validateMetadataPropertyName,
  validateSortType,
} from "./interfaces/EntityListSortByOptions";
export type { TimeFrame } from "./interfaces/TimeFrame";
export type { NsfwFilter } from "./interfaces/NsfwFilter";
export type { BlockedFilter } from "./interfaces/BlockedFilter";
export type {
  Connection,
  EstablishedConnection,
  PendingConnection,
  ConnectionRequestParams,
  ConnectionActionResponse,
  ConnectionWithdrawResponse,
  ConnectionCountResponse,
  RemoveConnectionByUserIdResponse,
  ConnectionStatusResponse,
  ConnectionStatus,
} from "./interfaces/models/Connection";
export type {
  Image,
  ImageVariant,
  UploadImageOptions,
} from "./interfaces/models/Image";
export type { File } from "./interfaces/models/File";

// -- chat hooks
export {
  useConversations,
  useConversation,
  useFetchConversation,
  useFetchConversationPreview,
  useUpdateConversation,
  useDeleteConversation,
  useCreateDirectConversation,
  useFetchSpaceConversation,
  useConversationMembers,
  useMuteConversation,
  useLiveChatMessages,
  useChatMessages,
  useFetchManyChatMessages,
  useFetchManyChatMessagesWrapper,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useToggleReaction,
  useMessageThread,
  useTotalUnreadCount,
  useUnreadConversationCount,
  useMarkConversationAsRead,
  useConversationData,
  useTypingIndicator,
  useChatSocket,
} from "./hooks/chat";
export type {
  UseConversationsProps,
  UseConversationsValues,
  UseConversationProps,
  UseConversationValues,
  UpdateConversationParams,
  FetchConversationProps,
  FetchConversationPreviewProps,
  DeleteConversationProps,
  CreateDirectConversationProps,
  UseFetchSpaceConversationProps,
  UseFetchSpaceConversationValues,
  UseConversationMembersProps,
  UseConversationMembersValues,
  MuteConversationProps,
  UseMuteConversationValues,
  UseLiveChatMessagesProps,
  UseLiveChatMessagesValues,
  UseChatMessagesProps,
  UseChatMessagesValues,
  FetchManyChatMessagesProps,
  FetchManyChatMessagesResponse,
  UseFetchManyChatMessagesWrapperProps,
  UseFetchManyChatMessagesWrapperValues,
  MessageFilters,
  SendMessageParams,
  UseSendMessageProps,
  EditMessageParams,
  DeleteMessageParams,
  ToggleReactionParams,
  ToggleReactionResult,
  UseMessageThreadProps,
  UseMessageThreadValues,
  UseMarkConversationAsReadProps,
  UseConversationDataProps,
  UseConversationDataValues,
  UseTypingIndicatorProps,
  UseTypingIndicatorValues,
  UseChatSocketValues,
} from "./hooks/chat";

// -- chat interfaces
export type {
  Conversation,
  ConversationPreview,
} from "./interfaces/models/Conversation";
export type {
  ConversationMember,
  ConversationMemberRole,
} from "./interfaces/models/ConversationMember";
export type { ChatMessage } from "./interfaces/models/ChatMessage";

// -- chat slice
export {
  setConversation,
  setConversationLoading,
  setConversationList,
  setConversationListLoading,
  setConversationListHasMore,
  setConversationListCursor,
  upsertConversationPreview,
  insertConversationPreview,
  removeConversationPreview,
  incrementUnread,
  clearUnread,
  setMessagesLoading,
  setMessagesHasMore,
  upsertMessage,
  addOptimisticMessage,
  failOptimisticMessage,
  removeMessage,
  updateReactions,
  setThreadReplies,
  setThreadLoading,
  setTypingUsers,
  setSocketConnected,
  selectConversation,
  selectConversationLoading,
  selectConversationList,
  selectConversationListLoading,
  selectConversationListHasMore,
  selectConversationListCursor,
  selectMessages,
  selectMessagesLoading,
  selectMessagesHasMore,
  selectOldestMessageId,
  selectNewestMessageId,
  selectThreadReplies,
  selectThreadLoading,
  selectThreadHasMore,
  selectTypingUsers,
  selectSocketConnected,
  type ChatState,
} from "./store/slices/chatSlice";
