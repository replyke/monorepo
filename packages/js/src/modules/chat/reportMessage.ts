import { SublayHttpClient } from "../../core/client";

export interface ReportMessageProps {
  conversationId: string;
  messageId: string;
  reason: string;
  details?: string;
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
