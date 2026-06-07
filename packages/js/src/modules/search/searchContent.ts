import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { Comment } from "../../interfaces/Comment";
import { ChatMessage } from "../../interfaces/ChatMessage";

export interface SearchContentProps {
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
  const response = await client.projectInstance.post<ContentSearchResult[]>(
    "/search/content",
    data
  );
  return response.data;
}
