import { SublayHttpClient } from "../../core/client";

export interface RemoveEntityFromCollectionProps {
  collectionId: string;
  entityId: string;
  userId: string;
}

export async function removeEntityFromCollection(
  client: SublayHttpClient,
  data: RemoveEntityFromCollectionProps
): Promise<void> {
  const { collectionId, entityId, userId } = data;
  await client.projectInstance.delete(
    `/collections/${collectionId}/entities/${entityId}`,
    { params: { userId } }
  );
}
