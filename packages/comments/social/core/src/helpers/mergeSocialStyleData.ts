import { Style } from "@replyke/core";
import { safeMergeStyleProps } from "@replyke/ui-core";
import { socialBaseStyle } from "../social-base-style";
import { CommentStyleProps } from "../interfaces/style-props/CommentStyleProps";
import { CommentFeedStyleProps } from "../interfaces/style-props/CommentFeedStyleProps";
import { NewCommentFormStyleProps } from "../interfaces/style-props/NewCommentFormStyleProps";
import { isSocialStyleConfig } from "./isSocialStyleConfig";

export function mergeSocialStyleData(
  customStyle: Style,
  commentFeedProps?: Partial<CommentFeedStyleProps>,
  commentProps?: Partial<CommentStyleProps>,
  newCommentFormProps?: Partial<NewCommentFormStyleProps>
) {
  if (!isSocialStyleConfig(customStyle.config))
    throw new Error("Invalid style config was provided");

  const mergedStyle = {
    commentFeedProps: safeMergeStyleProps(
      socialBaseStyle.commentFeedProps,
      customStyle.config.commentFeedProps,
      commentFeedProps
    ),
    commentProps: safeMergeStyleProps(
      socialBaseStyle.commentProps,
      customStyle.config.commentProps,
      commentProps
    ),
    newCommentFormProps: safeMergeStyleProps(
      socialBaseStyle.newCommentFormProps,
      customStyle.config.newCommentFormProps,
      newCommentFormProps
    ),
  };

  return mergedStyle;
}
