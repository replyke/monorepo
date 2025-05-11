import { SocialStyleConfig } from "../interfaces/style-props/SocialStyleConfig";

export function isSocialStyleConfig(
  config: Record<string, any>
): config is SocialStyleConfig {
  return (config as SocialStyleConfig)?.commentFeedProps !== undefined;
}
