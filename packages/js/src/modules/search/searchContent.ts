import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { Comment } from "../../interfaces/Comment";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface SearchContentProps extends SpaceReputationContextParams {
  query: string;
  sourceTypes?: ("entity" | "comment" | "message")[];
  spaceId?: string;
  /**
   * With a `spaceId`, also search every space nested under it (children,
   * grandchildren — the whole subtree, any depth). Ignored without a `spaceId`.
   * Defaults to false (exact-space search).
   */
  includeChildSpaces?: boolean;
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
  // request body, so they are forwarded as query params (flattened via the
  // helper so the `spaceReputation` object never reaches the serializer).
  const {
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...body
  } = data;
  const response = await client.projectInstance.post<ContentSearchResult[]>(
    "/search/content",
    body,
    {
      params: buildSpaceReputationParams({
        spaceReputation,
        spaceReputationId,
        spaceReputationDescendants,
      }),
    }
  );
  return response.data;
}
