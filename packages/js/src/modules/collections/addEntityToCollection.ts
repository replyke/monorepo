import { SublayHttpClient } from "../../core/client";

export interface AddEntityToCollectionProps {
  collectionId: string;
  entityId: string;
}

export interface CollectionEntityMutationResponse {
  success: boolean;
  collection: {
    id: string;
    entityCount: number;
  };
}

export async function addEntityToCollection(
  client: SublayHttpClient,
  data: AddEntityToCollectionProps
): Promise<CollectionEntityMutationResponse> {
  const { collectionId, ...body } = data;
  const response =
    await client.projectInstance.post<CollectionEntityMutationResponse>(
      `/collections/${collectionId}/entities`,
      body
    );
  return response.data;
}
