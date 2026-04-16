import { ReplykeHttpClient } from "../../core/client";

export interface RemoveEntityFromCollectionProps {
  collectionId: string;
  entityId: string;
}

export async function removeEntityFromCollection(
  client: ReplykeHttpClient,
  data: RemoveEntityFromCollectionProps
): Promise<void> {
  const { collectionId, entityId } = data;
  await client.projectInstance.delete(
    `/collections/${collectionId}/entities/${entityId}`
  );
}
