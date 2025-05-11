import { FontWeight } from "@replyke/ui-core"

export type NewCommentFormStyleProps = {
  backgroundColor: string;          // Background color of the form.
  withAvatar: boolean;              // Whether to show the user’s avatar.
  itemsGap: number;                 // Gap between items in the form.
  verticalPadding: number;          // Vertical padding inside the form.
  paddingLeft: number;              // Left padding inside the form.
  paddingRight: number;             // Right padding inside the form.
  authorAvatarSize: number;         // Size of the user’s avatar.
  placeholderText: string;          // Placeholder text for the input.
  textareaTextSize: number;         // Font size of the textarea text.
  postButtonText: string;           // Text on the post button.
  postButtonFontSize: number;       // Font size for the post button text.
  postButtonFontWeight: FontWeight; // Font weight for the post button text.
  postButtonFontColor: string;      // Font color for the post button text.
};