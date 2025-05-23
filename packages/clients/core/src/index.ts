// Helpers & Utilities
export { handleError } from "./utils/handleError";
export { safeMergeStyleProps } from "./helpers/safeMergeStyleProps";
export { getUserName } from "./helpers/getUserName";
export { default as getPublicFileUrl } from "./helpers/getPublicFileUrl";

// Constants
export { reportReasons } from "./constants/reportReasons";
export type { ReportReasonKey } from "./constants/reportReasons";

// Context providers
export {
  ReplykeProvider,
  EntityListProvider,
  EntityProvider,
  ListsProvider,
  AppNotificationsProvider,
  CommentSectionProvider,
} from "./context";

// -- projects
export { useProject, useProjectData } from "./hooks/projects";

// -- crypto
export { useSignTestingJwt } from "./hooks/crypto";

// -- authentication
export {
  useAuth,
  useAuthData,
  useRequestNewAccessToken,
  useSignUpWithEmailAndPassword,
  useSignInWithEmailAndPassword,
  useSignOut,
  useChangePassword,
  useVerifyExternalUser,
} from "./hooks/auth";

// -- app notifications
export {
  useAppNotifications,
  useAppNotificationsData,
  useCountUnreadNotifications,
  useFetchAppNotifications,
  useMarkNotificationAsRead,
} from "./hooks/app-notifications";

// -- entities
export {
  useEntity,
  useEntityData,
  useCreateEntity,
  useFetchEntity,
  useFetchEntityByForeignId,
  useFetchEntityByShortId,
  useUpdateEntity,
  useEntityVotes,
  useDeleteEntity,
  useEntityList,
  useEntityListData,
  useInfusedData,
} from "./hooks/entities";

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
  useCommentVotes,
  useDeleteComment,
  useEntityComments,
  useProfileComments,
} from "./hooks/comments";

// -- lists
export {
  useLists,
  useListsData,
  useCreateList,
  useFetchRootList,
  useFetchSubLists,
  useIsEntitySaved,
  useUpdateList,
  useAddToList,
  useRemoveFromList,
  useDeleteList,
} from "./hooks/lists";

// -- users
export {
  useUser,
  useUserData,
  useFetchUser,
  useFetchUserByForeignId,
  useFetchUserFollowersCount,
  useFetchUserFollowingCount,
  useCheckUsernameAvailability,
  useFetchUserSuggestions,
  useMentions,
  useUpdateUser,
  useFetchFollow,
  useFollowUser,
  useUnfollowUser,
} from "./hooks/users";

// -- reports
export { useCreateReport } from "./hooks/reports";

// -- general
export { useGetMetadata } from "./hooks/utils";

// -- storage
export { useUploadFile } from "./hooks/storage";

// Interfaces
export type { EntityCommentsTree } from "./interfaces/EntityCommentsTree";
export type { UserFull, User } from "./interfaces/models/User";
export * as AppNotification from "./interfaces/models/AppNotification";
export type { Entity } from "./interfaces/models/Entity";
export type { List } from "./interfaces/models/List";
export type { Comment, GifData } from "./interfaces/models/Comment";
export type { Mention } from "./interfaces/models/Mention";
export type { CommentsSortByOptions } from "./interfaces/CommentsSortByOptions";
export type { EntityListSortByOptions } from "./interfaces/EntityListSortByOptions";
export type { TimeFrame } from "./interfaces/TimeFrame";
