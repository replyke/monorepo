import { SublayHttpClient } from "../../core/client";

export interface AskContentProps {
  query: string;
  sourceTypes?: ("entity" | "comment" | "message")[];
  spaceId?: string;
  conversationId?: string;
  limit?: number;
}

export interface AskContentResponse {
  answer: string;
  sources?: { entityId: string; title: string | null }[];
}

export async function askContent(
  client: SublayHttpClient,
  data: AskContentProps
): Promise<AskContentResponse> {
  const response = await client.projectInstance.post<AskContentResponse>(
    "/search/ask",
    data
  );
  return response.data;
}
