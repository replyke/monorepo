import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchDraftsProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchDrafts(
  client: ReplykeHttpClient,
  data: FetchDraftsProps
): Promise<PaginatedResponse<Entity>> {
  const response = await client.projectInstance.get<PaginatedResponse<Entity>>(
    "/entities/drafts",
    { params: data }
  );
  return response.data;
}
