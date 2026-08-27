import { SublayHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface UpdateCollectionProps {
  collectionId: string;
  userId: string;
  name: string;
}

export async function updateCollection(
  client: SublayHttpClient,
  data: UpdateCollectionProps
): Promise<Collection> {
  const { collectionId, ...body } = data;
  const response = await client.projectInstance.patch<Collection>(
    `/collections/${collectionId}`,
    body
  );
  return response.data;
}
