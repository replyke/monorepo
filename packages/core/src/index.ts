// Helpers & Utilities
export { handleError } from "./utils/handleError";
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

// Constants
export { reportReasons } from "./constants/reportReasons";
export type { ReportReasonKey } from "./constants/reportReasons";

// Context providers (Redux-powered by default)
export {
  ReplykeProvider,
  ReplykeIntegrationProvider,
  EntityProvider,
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
  replykeReducers,
  replykeApiReducer,
  replykeMiddleware,
  replykeApi,
  type ReplykeState,
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
  type UseAuthValues,
  type SignUpWithEmailAndPasswordProps,
  type SignInWithEmailAndPasswordProps,
  type ChangePasswordProps,
  type RequestPasswordResetProps,
  type SendVerificationEmailProps,
  type VerifyEmailProps,
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

// -- store internals (for platform-specific hooks in react-js / react-native)
export { useReplykeDispatch, useReplykeSelector } from "./store/hooks";
export {
  setTokens,
  setInitialized,
  selectAccessToken,
} from "./store/slices/authSlice";
export { requestNewAccessTokenThunk } from "./store/slices/authThunks";

// -- account storage
export type { AccountStorage } from "./interfaces/AccountStorage";
export {
  MAX_ACCOUNTS,
  type AccountSummary,
  type AccountEntry,
  type AccountMap,
} from "./store/slices/accountsSlice";

// -- (current) user
export {
  useUser,
  useUserActions,
  type UseUserProps,
  type UseUserValues,
  type UpdateUserParams,
} from "./hooks/user";

// -- app notifications
export {
  useAppNotifications,
  useAppNotificationsActions,
  type UseAppNotificationsProps,
  type UseAppNotificationsValues,
} from "./hooks/app-notifications";

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
  useUpdateMemberRole,
  useApproveMember,
  useDeclineMember,
  useRemoveMember,
  useUnbanMember,
  useModerateSpaceEntity,
  useModerateSpaceComment,
  useSpacePermissions,
  useSpaceMentions,
  useCheckMyMembership,
  // Digest config hooks
  useFetchDigestConfig,
  useUpdateDigestConfig,
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
  type CheckMyMembershipProps,
  type UpdateMemberRoleProps,
  type ApproveMemberProps,
  type DeclineMemberProps,
  type RemoveMemberProps,
  type UnbanMemberProps,
  type ModerateSpaceEntityProps,
  type ModerateSpaceCommentProps,
  type UseSpacePermissionsProps,
  type UseSpacePermissionsValues,
  type UseSpaceMentionsProps,
  type UseSpaceMentionsValues,
  type FetchDigestConfigProps,
  type UpdateDigestConfigProps,
  type CreateRuleProps,
  type UpdateRuleProps,
  type DeleteRuleProps,
  type FetchRuleProps,
  type FetchManyRulesProps,
  type ReorderRulesProps,
} from "./hooks/spaces";

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

// -- reports
export {
  useCreateReport,
  useFetchModeratedReports,
  useHandleSpaceEntityReport,
  useHandleSpaceCommentReport,
  type UseCreateReportProps,
  type CreateReportProps,
  type CreateCommentReportProps,
  type CreateEntityReportProps,
  type FetchModeratedReportsParams,
  type ReportUserReport,
  type Report,
  type HandleSpaceEntityReportParams,
  type HandleReportResponse,
  type HandleSpaceCommentReportParams,
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
export type { Collection } from "./interfaces/models/Collection";
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
  DigestConfig,
  UpdateDigestConfigProps as UpdateDigestConfigBody,
  SpaceInclude,
  SpaceIncludeArray,
  SpaceIncludeParam,
} from "./interfaces/models/Space";
export type {
  SpaceMember,
  SpaceMemberRole,
  SpaceMemberStatus,
  SpaceMemberWithUser,
  SpaceMembersResponse,
  SpaceTeamResponse,
} from "./interfaces/models/SpaceMember";
export type {
  SpaceListSortByOptions,
  SpaceListFilters,
} from "./interfaces/SpaceListSortByOptions";
export type { SpaceBreadcrumb } from "./interfaces/SpaceBreadcrumb";
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
export type {
  Connection,
  EstablishedConnection,
  PendingConnection,
  ConnectionsResponse,
  PendingConnectionsResponse,
  PendingConnectionListResponse,
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
  useUpdateConversation,
  useDeleteConversation,
  useCreateDirectConversation,
  useFetchSpaceConversation,
  useConversationMembers,
  useChatMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useToggleReaction,
  useMessageThread,
  useTotalUnreadCount,
  useUnreadConversationCount,
  useMarkConversationAsRead,
  useReportMessage,
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
  DeleteConversationProps,
  CreateDirectConversationProps,
  UseFetchSpaceConversationProps,
  UseFetchSpaceConversationValues,
  UseConversationMembersProps,
  UseConversationMembersValues,
  UseChatMessagesProps,
  UseChatMessagesValues,
  SendMessageParams,
  UseSendMessageProps,
  EditMessageParams,
  DeleteMessageParams,
  ToggleReactionParams,
  ToggleReactionResult,
  UseMessageThreadProps,
  UseMessageThreadValues,
  UseMarkConversationAsReadProps,
  ReportMessageParams,
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
