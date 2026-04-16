import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchCollectionEntitiesProps {
  collectionId: string;
  page?: number;
  limit?: number;
}

export async function fetchCollectionEntities(
  client: ReplykeHttpClient,
  data: FetchCollectionEntitiesProps
): Promise<PaginatedResponse<Entity>> {
  const { collectionId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<Entity>>(
    `/collections/${collectionId}/entities`,
    { params }
  );
  return response.data;
}
