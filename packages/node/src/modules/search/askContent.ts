import { ReplykeHttpClient } from "../../core/client";

export interface AskContentProps {
  question: string;
  spaceId?: string;
}

export interface AskContentResponse {
  answer: string;
  sources?: { entityId: string; title: string | null }[];
}

export async function askContent(
  client: ReplykeHttpClient,
  data: AskContentProps
): Promise<AskContentResponse> {
  const response = await client.projectInstance.post<AskContentResponse>(
    "/search/ask",
    data
  );
  return response.data;
}
