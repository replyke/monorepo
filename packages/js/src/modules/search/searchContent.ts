import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { Comment } from "../../interfaces/Comment";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface SearchContentProps extends SpaceReputationContextParams {
  query: string;
  sourceTypes?: ("entity" | "comment" | "message")[];
  spaceId?: string;
  conversationId?: string;
  limit?: number;
}

export interface ContentSearchResult {
  sourceType: "entity" | "comment" | "message";
  similarity: number;
  record: Entity | Comment | ChatMessage;
}

export async function searchContent(
  client: SublayHttpClient,
  data: SearchContentProps
): Promise<ContentSearchResult[]> {
  // The server reads the space-reputation options from `req.query`, not the
  // request body, so they are forwarded as query params.
  const { spaceReputationId, spaceReputationDescendants, ...body } = data;
  const response = await client.projectInstance.post<ContentSearchResult[]>(
    "/search/content",
    body,
    { params: { spaceReputationId, spaceReputationDescendants } }
  );
  return response.data;
}
