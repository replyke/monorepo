import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface SearchContentProps {
  query: string;
  sourceTypes?: ("entity" | "comment" | "message")[];
  spaceId?: string;
  conversationId?: string;
  limit?: number;
}

export async function searchContent(
  client: SublayHttpClient,
  data: SearchContentProps
): Promise<PaginatedResponse<Entity>> {
  const response = await client.projectInstance.post<PaginatedResponse<Entity>>(
    "/search/content",
    data
  );
  return response.data;
}
