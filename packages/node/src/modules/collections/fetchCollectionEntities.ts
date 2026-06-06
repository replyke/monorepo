import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchCollectionEntitiesProps {
  collectionId: string;
  userId: string;
  page?: number;
  limit?: number;
  sortBy?: "new" | "added" | "top" | "hot";
  sortDir?: "asc" | "desc";
  /** Comma-separated list of associations to populate, e.g. "user". */
  include?: string;
}

export async function fetchCollectionEntities(
  client: SublayHttpClient,
  data: FetchCollectionEntitiesProps
): Promise<PaginatedResponse<Entity>> {
  const { collectionId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<Entity>>(
    `/collections/${collectionId}/entities`,
    { params }
  );
  return response.data;
}
