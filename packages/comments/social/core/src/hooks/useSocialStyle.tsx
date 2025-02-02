import { useEffect, useState } from "react";
import { Style, useFetchStyle, handleError } from "@replyke/core";

import { socialBaseStyle } from "../social-base-style";
import { SocialStyleConfig } from "../interfaces/style-props/SocialStyleConfig";

import { CommentFeedStyleProps } from "../interfaces/style-props/CommentFeedStyleProps";
import { CommentStyleProps } from "../interfaces/style-props/CommentStyleProps";
import { NewCommentFormStyleProps } from "../interfaces/style-props/NewCommentFormStyleProps";
import { mergeSocialStyleData } from "../helpers/mergeSocialStyleData";

export interface UseSocialStyleProps {
  styleId: string;
  commentFeedProps: Partial<CommentFeedStyleProps>;
  commentProps: Partial<CommentStyleProps>;
  newCommentFormProps: Partial<NewCommentFormStyleProps>;
}

function useSocialStyle(props?: Partial<UseSocialStyleProps>) {
  const fetchStyle = useFetchStyle();

  const [styleConfig, setStyleConfig] =
    useState<SocialStyleConfig>(socialBaseStyle);
  const [customStyle, setCustomStyle] = useState<Style>({
    id: "DEFAULT",
    name: "DEFAULT",
    type: "social",
    clientId: "",
    config: socialBaseStyle,
  });

  // This useEffect should on run once to fetch the style details
  useEffect(() => {
    (async () => {
      try {
        if (!props?.styleId) return;

        const fetchedStyle = await fetchStyle(props.styleId);
        setCustomStyle(fetchedStyle);
      } catch (err: unknown) {
        handleError(err, "Failed to fetch style config: ");
      }
    })();
  }, [props]);

  useEffect(() => {
    const mergedStyle = mergeSocialStyleData(
      customStyle,
      props?.commentFeedProps,
      props?.commentProps,
      props?.newCommentFormProps
    );
    setStyleConfig(mergedStyle);
  }, [customStyle, props]);

  return styleConfig;
}

export default useSocialStyle;
