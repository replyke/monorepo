import { SublayHttpClient } from "../../core/client";

export interface ModerateSpaceChatMessageProps {
  spaceId: string;
  messageId: string;
  moderationStatus: "removed";
  moderationReason?: string;
  /**
   * Acting moderator, for attribution only. This route is service-key god-mode
   * (the space-moderator check is bypassed for service keys); omit for a
   * backend/system action.
   */
  actingUserId?: string;
}

export interface ModerateSpaceChatMessageResponse {
  message: string;
  moderationStatus: string;
}

export async function moderateSpaceChatMessage(
  client: SublayHttpClient,
  data: ModerateSpaceChatMessageProps
): Promise<ModerateSpaceChatMessageResponse> {
  const { spaceId, messageId, ...body } = data;
  const response = await client.projectInstance.patch<ModerateSpaceChatMessageResponse>(
    `/spaces/${spaceId}/chat/messages/${messageId}/moderation`,
    body
  );
  return response.data;
}
