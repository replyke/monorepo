import { NotificationParams } from "../interfaces/IAppNotification";

export default function validateNotificationParams(
  params: NotificationParams
): boolean {
  switch (params.type) {
    case "entity-comment":
      return (
        !!params.metadata.entityId &&
        !!params.metadata.commentId &&
        !!params.metadata.initiatorId
      );

    case "comment-reply":
      return (
        !!params.metadata.entityId &&
        !!params.metadata.commentId &&
        !!params.metadata.replyId &&
        !!params.metadata.initiatorId
      );

    case "entity-mention":
      return !!params.metadata.entityId && !!params.metadata.initiatorId;

    case "comment-mention":
      return (
        !!params.metadata.entityId &&
        !!params.metadata.commentId &&
        !!params.metadata.initiatorId
      );

    case "entity-upvote":
      return !!params.metadata.entityId && !!params.metadata.initiatorId;

    case "comment-upvote":
      return (
        !!params.metadata.entityId &&
        !!params.metadata.commentId &&
        !!params.metadata.initiatorId
      );

    default:
      return false;
  }
}
