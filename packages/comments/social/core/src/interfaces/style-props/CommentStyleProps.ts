import { FontWeight } from "@replyke/ui-core";

export interface CommentStyleProps {
  horizontalItemsGap: number;        // Horizontal gap between items.
  verticalItemsGap: number;         // Vertical gap between items.
  authorAvatarSize: number;         // Size of the author’s avatar.
  authorFontSize: number;           // Font size for the author’s name.
  authorFontWeight: FontWeight;     // Font weight for the author’s name.
  authorFontColor: string;          // Font color for the author’s name.
  fromNowFontSize: number;          // Font size for the "time ago" text.
  fromNowFontColor: string;         // Font color for the "time ago" text.
  commentBodyFontSize: number;      // Font size for the comment text.
  commentBodyFontColor: string;     // Font color for the comment text.
  actionsItemGap: number;           // Gap between action items (e.g., like, reply).
  replyButtonFontSize: number;      // Font size for the reply button.
  replyButtonFontWeight: FontWeight;// Font weight for the reply button.
  replyButtonFontColor: string;     // Font color for the reply button.
  heartIconSize: number;            // Size of the heart (like) icon.
  heartIconFullColor: string;       // Color for a filled heart icon.
  heartIconEmptyColor: string;      // Color for an empty heart icon.
  heartIconPaddingBottom: number;   // Padding below the heart icon.
  likesCountFontSize: number;       // Font size for the likes count.
  likesCountFontWeight: FontWeight; // Font weight for the likes count.
  likesCountFontColor: string;      // Font color for the likes count.
  viewRepliesPaddingTop: number;    // Padding above the "view replies" text.
  viewMoreRepliesText: string;      // Text for "view more replies" action.
  hideRepliesText: string;          // Text for "hide replies" action.
  repliesGap: number;               // Gap between replies.
  repliesPaddingTop: number;        // Padding above the replies section.
  justNowText: string;              // Text to display for very recent comments.
}