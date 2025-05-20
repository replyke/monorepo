import { useEffect, useState } from "react";

import { socialBaseStyle } from "../social-base-style";
import {
  PartialSocialStyleConfig,
  SocialStyleConfig,
} from "../interfaces/style-props/SocialStyleConfig";

import { mergeSocialStyleData } from "../helpers/mergeSocialStyleData";

export interface UseSocialStyleProps extends PartialSocialStyleConfig {}

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
