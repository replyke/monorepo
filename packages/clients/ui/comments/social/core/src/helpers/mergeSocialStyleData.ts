import { safeMergeStyleProps } from "@replyke/ui-core";
import { socialBaseStyle } from "../social-base-style";
import { CommentStyleProps } from "../interfaces/style-props/CommentStyleProps";
import { CommentFeedStyleProps } from "../interfaces/style-props/CommentFeedStyleProps";
import { NewCommentFormStyleProps } from "../interfaces/style-props/NewCommentFormStyleProps";

export function mergeSocialStyleData(
  commentFeedProps?: Partial<CommentFeedStyleProps>,
  commentProps?: Partial<CommentStyleProps>,
  newCommentFormProps?: Partial<NewCommentFormStyleProps>
) {

  const mergedStyle = {
    commentFeedProps: safeMergeStyleProps(
      socialBaseStyle.commentFeedProps,
      commentFeedProps
    ),
    commentProps: safeMergeStyleProps(
      socialBaseStyle.commentProps,
      commentProps
    ),
    newCommentFormProps: safeMergeStyleProps(
      socialBaseStyle.newCommentFormProps,
      newCommentFormProps
    ),
  };

  return mergedStyle;
}
