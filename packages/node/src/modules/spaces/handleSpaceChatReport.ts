import { SublayHttpClient } from "../../core/client";

export type SpaceChatReportAction = "remove-message" | "ban-user" | "dismiss";

export interface HandleSpaceChatReportProps {
  spaceId: string;
  reportId: string;
  actions: SpaceChatReportAction[];
  summary?: string;
  /** The user to ban (target), required when actions include "ban-user". */
  userId?: string;
  reason?: string;
  /** The message to remove, required when actions include "remove-message". */
  messageId?: string;
  /**
   * Acting moderator, for attribution only. This route is service-key god-mode
   * (the space-moderator check is bypassed for service keys); omit for a
   * backend/system action.
   */
  actingUserId?: string;
}

export interface HandleSpaceChatReportResponse {
  message: string;
  code: string;
}

export async function handleSpaceChatReport(
  client: SublayHttpClient,
  data: HandleSpaceChatReportProps
): Promise<HandleSpaceChatReportResponse> {
  const { spaceId, reportId, ...body } = data;
  const response = await client.projectInstance.patch<HandleSpaceChatReportResponse>(
    `/spaces/${spaceId}/chat/reports/${reportId}`,
    body
  );
  return response.data;
}
