type AppNotificationType =
  | "system"
  | "entity-comment"
  | "comment-reply"
  | "entity-mention"
  | "comment-mention"
  | "entity-upvote"
  | "comment-upvote"
  | "new-follow"
  | "connection-request"
  | "connection-accepted";
// | "followRequest"
// | "followRequestAccepted"
// | "friendRequest"
// | "friendRequestAccepted"
// | "postShare"
// | "eventInvite"
// | "groupInvite"
// | "groupJoinRequest"
// | "groupJoinRequestApproved"
// | "system"
// | "custom";

interface BaseAppNotification {
  id: string; // Unique identifier (UUID)
  userId: string; // The recipient's user ID
  type: AppNotificationType; // Type of notification
  isRead: boolean; // Read status
  metadata: Record<string, any>; // Additional data specific to the notification type
  createdAt: string; // ISO timestamp string
}

// User need to sett from dashboard:
// title
// content
// With button? When button does?

export interface SystemNotification extends BaseAppNotification {
  type: "system";
  action: string;
  metadata: {
    title?: string;
    content?: string;
    buttonData: {
      text: string;
      url: string;
    } | null;
  };
}

export interface EntityCommentNotification extends BaseAppNotification {
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

export interface CommentReplyNotification extends BaseAppNotification {
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

export interface EntityMentionNotification extends BaseAppNotification {
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

export interface CommentMentionNotification extends BaseAppNotification {
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

export interface EntityUpvoteNotification extends BaseAppNotification {
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

export interface CommentUpvoteNotification extends BaseAppNotification {
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

export interface NewFollowNotification extends BaseAppNotification {
  type: "new-follow";
  action: "open-profile";
  metadata: {
    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface ConnectionRequestNotification extends BaseAppNotification {
  type: "connection-request";
  action: "open-profile";
  metadata: {
    connectionId: string;
    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface ConnectionAcceptedNotification extends BaseAppNotification {
  type: "connection-accepted";
  action: "open-profile";
  metadata: {
    connectionId: string;
    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

// export interface FollowRequestNotification extends BaseAppNotification {
//   type: "followRequest";
//   metadata: {
//     requesterId: string;
//   };
// }

// export interface FollowRequestAcceptedNotification extends BaseAppNotification {
//   type: "followRequestAccepted";
//   metadata: {
//     followerId: string;
//   };
// }

// export interface FriendRequestNotification extends BaseAppNotification {
//   type: "friendRequest";
//   metadata: {
//     requesterId: string;
//   };
// }

// export interface FriendRequestAcceptedNotification extends BaseAppNotification {
//   type: "friendRequestAccepted";
//   metadata: {
//     friendId: string;
//   };
// }

// export interface PostShareNotification extends BaseAppNotification {
//   type: "postShare";
//   metadata: {
//     postId: string;
//     sharerId: string;
//   };
// }

// export interface EventInviteNotification extends BaseAppNotification {
//   type: "eventInvite";
//   metadata: {
//     eventId: string;
//     inviterId: string;
//   };
// }

// export interface GroupInviteNotification extends BaseAppNotification {
//   type: "groupInvite";
//   metadata: {
//     groupId: string;
//     inviterId: string;
//   };
// }

// export interface GroupJoinRequestNotification extends BaseAppNotification {
//   type: "groupJoinRequest";
//   metadata: {
//     groupId: string;
//     requesterId: string;
//   };
// }

// export interface GroupJoinRequestApprovedNotification
//   extends BaseAppNotification {
//   type: "groupJoinRequestApproved";
//   metadata: {
//     groupId: string;
//     approverId: string;
//   };
// }

// export interface SystemNotification extends BaseAppNotification {
//   type: "system";
//   metadata: {
//     message: string;
//   };
// }

// export interface CustomNotification extends BaseAppNotification {
//   type: "custom";
//   metadata: Record<string, any>; // Flexible metadata for custom notifications
// }

// Unified Notification Type
export type UnifiedAppNotification =
  | SystemNotification
  | EntityCommentNotification
  | CommentReplyNotification
  | EntityMentionNotification
  | CommentMentionNotification
  | EntityUpvoteNotification
  | CommentUpvoteNotification
  | NewFollowNotification
  | ConnectionRequestNotification
  | ConnectionAcceptedNotification;
// | LikeNotification
// | ReplyNotification
// | MentionNotification
// | TagNotification
// | FollowRequestNotification
// | FollowRequestAcceptedNotification
// | FriendRequestNotification
// | FriendRequestAcceptedNotification
// | PostShareNotification
// | EventInviteNotification
// | GroupInviteNotification
// | GroupJoinRequestNotification
// | GroupJoinRequestApprovedNotification
// | SystemNotification
// | CustomNotification;

export type NotificationTemplate = { title?: string; content?: string };

export type NotificationTemplates = {
  entityComment: NotificationTemplate;
  commentReply: NotificationTemplate;
  entityMention: NotificationTemplate;
  commentMention: NotificationTemplate;
  entityUpvote: NotificationTemplate;
  commentUpvote: NotificationTemplate;
  newFollow: NotificationTemplate;
  connectionRequest: NotificationTemplate;
  connectionAccepted: NotificationTemplate;
};

export type PotentiallyPopulatedUnifiedAppNotification =
  UnifiedAppNotification & {
    title?: string;
    content?: string;
  };
