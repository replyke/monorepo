import { ReplykeHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface CreateNewCollectionProps {
  collectionId: string;
  name: string;
  metadata?: Record<string, any>;
}

export async function createNewCollection(
  client: ReplykeHttpClient,
  data: CreateNewCollectionProps
): Promise<Collection> {
  const { collectionId, ...body } = data;
  const response = await client.projectInstance.post<Collection>(
    `/collections/${collectionId}/sub-collections`,
    body
  );
  return response.data;
}
