import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface SearchContentProps {
  query: string;
  spaceId?: string;
  page?: number;
  limit?: number;
}

export async function searchContent(
  client: ReplykeHttpClient,
  data: SearchContentProps
): Promise<PaginatedResponse<Entity>> {
  const response = await client.projectInstance.post<PaginatedResponse<Entity>>(
    "/search/content",
    data
  );
  return response.data;
}
