import { SublayHttpClient } from "../../core/client";

export interface DeleteCollectionProps {
  collectionId: string;
  userId: string;
}

export async function deleteCollection(
  client: SublayHttpClient,
  data: DeleteCollectionProps
): Promise<void> {
  const { collectionId, userId } = data;
  await client.projectInstance.delete(`/collections/${collectionId}`, {
    params: { userId },
  });
}
