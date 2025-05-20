// Social section - helpers
export { isSocialStyleConfig } from "./helpers/isSocialStyleConfig";
export { mergeSocialStyleData } from "./helpers/mergeSocialStyleData";

// Social section -context
export { SocialStyleConfigProvider } from "./context/social-style-config-context";
// Social section - hooks
export { default as useSocialStyle } from "./hooks/useSocialStyle";
export { default as useSocialStyleConfig } from "./hooks/useSocialStyleConfig";

// Social section - interfaces
export type { SocialStyleCallbacks } from "./interfaces/Callbacks";

export type { CommentFeedStyleProps } from "./interfaces/style-props/CommentFeedStyleProps";
export type { CommentStyleProps } from "./interfaces/style-props/CommentStyleProps";
export type { NewCommentFormStyleProps } from "./interfaces/style-props/NewCommentFormStyleProps";
export type {
  SocialStyleConfig,
  PartialSocialStyleConfig,
} from "./interfaces/style-props/SocialStyleConfig";
export type { UseSocialStyleProps } from "./hooks/useSocialStyle";

// Social section - other
export { socialBaseStyle } from "./social-base-style";
