import {
  NotificationTemplate,
  NotificationTemplates,
  UnifiedAppNotification,
} from "../interfaces/models/AppNotification";
import { getUserName } from "./getUserName";

// Utility function to replace variables in a template
const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  return Object.entries(variables).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\$${key}`, "g"), value),
    template
  );
};

// Centralized logic to build variable replacements
const getReplacementVariables = (notification: any) => {
  return {
    userName: getUserName(
      {
        id: notification.metadata.initiatorId,
        name: notification.metadata.initiatorName,
        username: notification.metadata.initiatorUsername,
        avatar: notification.metadata.initiatorAvatar,
      },
      "name"
    ),
    userUsername: getUserName(
      {
        id: notification.metadata.initiatorId,
        name: notification.metadata.initiatorName,
        username: notification.metadata.initiatorUsername,
        avatar: notification.metadata.initiatorAvatar,
      },
      "username"
    ),
    entityTitle: notification.metadata.entityTitle || "",
    entityContent: notification.metadata.entityContent || "",
    commentContent: notification.metadata.commentContent || "",
    replyContent: notification.metadata.replyContent || "",
  };
};

// Generalized message configuration function
const configureMessage = (
  notification: any,
  defaultTitleTemplate: string,
  defaultContentTemplate: string,
  notificationTemplate?: NotificationTemplate
): { title: string; content: string } => {
  const variables = getReplacementVariables(notification);

  const titleTemplate = notificationTemplate?.title ?? defaultTitleTemplate;
  const contentTemplate =
    notificationTemplate?.content ?? defaultContentTemplate;

  const title = replaceTemplateVariables(titleTemplate, variables);
  const content = replaceTemplateVariables(contentTemplate, variables);

  return { title: title.trim(), content: content.trim() };
};

// Main notification mapping logic
export default (
  notifications: UnifiedAppNotification[],
  notificationTemplates?: Partial<NotificationTemplates>
): UnifiedAppNotification[] => {
  return notifications.map((notification) => {
    if (notification.title) return notification;

    let title = "";
    let content: string | null | undefined;

    switch (notification.type) {
      case "entity-comment":
        ({ title, content } = configureMessage(
          notification,
          `$userName commented on your post "$entityTitle"`,
          `$commentContent`,
          notificationTemplates?.entityComment
        ));
        break;
      case "comment-reply":
        ({ title, content } = configureMessage(
          notification,
          `$userName replied to your comment on "$entityTitle"`,
          `$replyContent`,
          notificationTemplates?.commentReply
        ));
        break;
      case "entity-mention":
        ({ title, content } = configureMessage(
          notification,
          `$userName mentioned you in their post`,
          `$entityTitle`,
          notificationTemplates?.entityMention
        ));
        break;
      case "comment-mention":
        ({ title, content } = configureMessage(
          notification,
          `$userName mentioned you in their comment on "$entityTitle"`,
          `$commentContent`,
          notificationTemplates?.commentMention
        ));
        break;
      case "entity-upvote":
        ({ title, content } = configureMessage(
          notification,
          `$userName upvoted your post "$entityTitle"`,
          ``,
          notificationTemplates?.entityUpvote
        ));
        break;
      case "comment-upvote":
        ({ title, content } = configureMessage(
          notification,
          `$userName upvoted your comment on "$entityTitle"`,
          `$commentContent`,
          notificationTemplates?.commentUpvote
        ));
        break;
      case "new-follow":
        ({ title, content } = configureMessage(
          notification,
          `$userName started following you`,
          ``,
          notificationTemplates?.newFollow
        ));
        break;
      default:
        break;
    }

    return {
      ...notification,
      title,
      content,
    } as UnifiedAppNotification;
  });
};
