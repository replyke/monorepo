import { ReplykeHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface AddEntityToCollectionProps {
  collectionId: string;
  entityId: string;
}

export async function addEntityToCollection(
  client: ReplykeHttpClient,
  data: AddEntityToCollectionProps
): Promise<Collection> {
  const { collectionId, entityId } = data;
  const response = await client.projectInstance.post<Collection>(
    `/collections/${collectionId}/entities`,
    { entityId }
  );
  return response.data;
}
