import { SublayHttpClient } from "../../core/client";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface AskContentProps extends SpaceReputationContextParams {
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
  const { spaceReputationId, spaceReputationDescendants, ...body } = data;
  const response = await client.projectInstance.post<AskContentResponse>(
    "/search/ask",
    body,
    { params: { spaceReputationId, spaceReputationDescendants } }
  );
  return response.data;
}
