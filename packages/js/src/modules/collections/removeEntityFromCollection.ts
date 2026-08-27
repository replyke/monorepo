import { SublayHttpClient } from "../../core/client";
import { CollectionEntityMutationResponse } from "./addEntityToCollection";

export interface RemoveEntityFromCollectionProps {
  collectionId: string;
  entityId: string;
}

export async function removeEntityFromCollection(
  client: SublayHttpClient,
  data: RemoveEntityFromCollectionProps
): Promise<CollectionEntityMutationResponse> {
  const { collectionId, entityId } = data;
  const response =
    await client.projectInstance.delete<CollectionEntityMutationResponse>(
      `/collections/${collectionId}/entities/${entityId}`
    );
  return response.data;
}
