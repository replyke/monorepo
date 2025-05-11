import { useEffect, useState } from "react";

import { socialBaseStyle } from "../social-base-style";
import { SocialStyleConfig } from "../interfaces/style-props/SocialStyleConfig";

import { CommentFeedStyleProps } from "../interfaces/style-props/CommentFeedStyleProps";
import { CommentStyleProps } from "../interfaces/style-props/CommentStyleProps";
import { NewCommentFormStyleProps } from "../interfaces/style-props/NewCommentFormStyleProps";
import { mergeSocialStyleData } from "../helpers/mergeSocialStyleData";

export interface UseSocialStyleProps {
  commentFeedProps: Partial<CommentFeedStyleProps>;
  commentProps: Partial<CommentStyleProps>;
  newCommentFormProps: Partial<NewCommentFormStyleProps>;
}

function useSocialStyle(props?: Partial<UseSocialStyleProps>) {
  const [styleConfig, setStyleConfig] =
    useState<SocialStyleConfig>(socialBaseStyle);

  useEffect(() => {
    const mergedStyle = mergeSocialStyleData(
      props?.commentFeedProps,
      props?.commentProps,
      props?.newCommentFormProps
    );
    setStyleConfig(mergedStyle);
  }, [props]);

  return styleConfig;
}

export default useSocialStyle;
