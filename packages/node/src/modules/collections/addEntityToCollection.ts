import { SublayHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface AddEntityToCollectionProps {
  collectionId: string;
  entityId: string;
  userId: string;
}

export async function addEntityToCollection(
  client: SublayHttpClient,
  data: AddEntityToCollectionProps
): Promise<Collection> {
  const { collectionId, ...body } = data;
  const response = await client.projectInstance.post<Collection>(
    `/collections/${collectionId}/entities`,
    body
  );
  return response.data;
}
