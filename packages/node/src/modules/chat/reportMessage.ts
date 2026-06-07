import { SublayHttpClient } from "../../core/client";

export interface ReportMessageProps {
  conversationId: string;
  messageId: string;
  reason: string;
  details?: string;
  /** The reporting user (must be a member). Service key required to name a user. */
  userId: string;
}

export interface ReportMessageResponse {
  message: string;
  code: string;
}

export async function reportMessage(
  client: SublayHttpClient,
  data: ReportMessageProps
): Promise<ReportMessageResponse> {
  const { conversationId, messageId, ...body } = data;
  const response = await client.projectInstance.post<ReportMessageResponse>(
    `/chat/conversations/${conversationId}/messages/${messageId}/report`,
    body
  );
  return response.data;
}
