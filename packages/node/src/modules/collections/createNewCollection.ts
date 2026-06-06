import { SublayHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface CreateNewCollectionProps {
  /** The parent collection under which to create the sub-collection. */
  collectionId: string;
  collectionName: string;
  userId: string;
}

export async function createNewCollection(
  client: SublayHttpClient,
  data: CreateNewCollectionProps
): Promise<Collection> {
  const { collectionId, ...body } = data;
  const response = await client.projectInstance.post<Collection>(
    `/collections/${collectionId}/sub-collections`,
    body
  );
  return response.data;
}
