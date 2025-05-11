import { Model, Optional } from "sequelize";

// Define the attributes of the AppNotification model
export interface IAppNotificationAttributes {
  id: string; // UUID, optional on creation
  projectId: string;
  userId: string; // ID of the user receiving the notification
  type: string; // Type of notification (like, comment, etc.)
  action: string; // Recommended action
  isRead: boolean; // Whether the notification is read
  metadata: Record<string, any>; // JSON data for additional info
  createdAt: Date; // Timestamp for creation
  updatedAt: Date; // Timestamp for updating
}

// Define the creation attributes (attributes that may be optional when creating)
export interface IAppNotificationCreationAttributes
  extends Optional<
    IAppNotificationAttributes,
    "id" | "createdAt" | "updatedAt" | "isRead"
  > {}

// Define the IAppNotification interface extending Sequelize's Model
export default interface IAppNotification
  extends Model<IAppNotificationAttributes, IAppNotificationCreationAttributes>,
    IAppNotificationAttributes {}

// Defining all the types of params required for each type of notification

interface BaseNotificationParams {
  projectId: string;
  userId: string;
}
interface EntityCommentNotificationParams extends BaseNotificationParams {
  type: "entity-comment";
  action: "open-comment";
  metadata: {
    entityId: string;
    entityShortId: string;
    entityTitle: string | null | undefined;
    entityContent: string | null | undefined;

    commentId: string;
    commentContent: string | null | undefined;

    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

interface CommentReplyNotificationParams extends BaseNotificationParams {
  type: "comment-reply";
  action: "open-comment";
  metadata: {
    entityId: string;
    entityShortId: string;
    entityTitle: string | null | undefined;
    entityContent: string | null | undefined;

    commentId: string;
    commentContent: string | null | undefined;

    replyId: string;
    replyContent: string | null | undefined;

    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface EntityMentionNotification extends BaseNotificationParams {
  type: "entity-mention";
  action: "open-entity";
  metadata: {
    entityId: string;
    entityShortId: string;
    entityTitle: string | null | undefined;
    entityContent: string | null | undefined;

    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface CommentMentionNotification extends BaseNotificationParams {
  type: "comment-mention";
  action: "open-comment";
  metadata: {
    entityId: string;
    entityShortId: string;
    entityTitle: string | null | undefined;
    entityContent: string | null | undefined;

    commentId: string;
    commentContent: string | null | undefined;

    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface EntityUpvoteNotification extends BaseNotificationParams {
  type: "entity-upvote";
  action: "open-entity";
  metadata: {
    entityId: string;
    entityShortId: string;
    entityTitle: string | null | undefined;
    entityContent: string | null | undefined;

    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface CommentUpvoteNotification extends BaseNotificationParams {
  type: "comment-upvote";
  action: "open-comment";
  metadata: {
    entityId: string;
    entityShortId: string;
    entityTitle: string | null | undefined;
    entityContent: string | null | undefined;

    commentId: string;
    commentContent: string | null | undefined;

    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface NewFollowNotification extends BaseNotificationParams {
  type: "new-follow";
  action: "open-profile";
  metadata: {
    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

// interface FollowRequestNotificationParams extends BaseNotificationParams {
//   type: "followRequest";
//   metadata: {
//     requesterId: string;
//   };
// }

// interface FollowRequestAcceptedNotificationParams
//   extends BaseNotificationParams {
//   type: "followRequestAccepted";
//   metadata: {
//     followerId: string;
//   };
// }

// interface FriendRequestNotificationParams extends BaseNotificationParams {
//   type: "friendRequest";
//   metadata: {
//     requesterId: string;
//   };
// }

// interface FriendRequestAcceptedNotificationParams
//   extends BaseNotificationParams {
//   type: "friendRequestAccepted";
//   metadata: {
//     friendId: string;
//   };
// }

// interface PostShareNotificationParams extends BaseNotificationParams {
//   type: "postShare";
//   metadata: {
//     postId: string;
//     sharerId: string;
//   };
// }

// interface EventInviteNotificationParams extends BaseNotificationParams {
//   type: "eventInvite";
//   metadata: {
//     eventId: string;
//     inviterId: string;
//   };
// }

// interface GroupInviteNotificationParams extends BaseNotificationParams {
//   type: "groupInvite";
//   metadata: {
//     groupId: string;
//     inviterId: string;
//   };
// }

// interface GroupJoinRequestNotificationParams extends BaseNotificationParams {
//   type: "groupJoinRequest";
//   metadata: {
//     groupId: string;
//     requesterId: string;
//   };
// }

// interface GroupJoinRequestApprovedNotificationParams
//   extends BaseNotificationParams {
//   type: "groupJoinRequestApproved";
//   metadata: {
//     groupId: string;
//     approverId: string;
//   };
// }

// interface SystemNotificationParams extends BaseNotificationParams {
//   type: "system";
//   metadata: {
//     message: string;
//   };
// }

// interface CustomNotificationParams extends BaseNotificationParams {
//   type: "custom";
//   metadata: Record<string, any>; // Flexible metadata for custom notifications
// }

// Add other notification types as needed...

// Union of all Notification Parameters
export type NotificationParams =
  | EntityCommentNotificationParams
  | CommentReplyNotificationParams
  | EntityMentionNotification
  | CommentMentionNotification
  | EntityUpvoteNotification
  | CommentUpvoteNotification
  | NewFollowNotification;
