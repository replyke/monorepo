import { ReplykeHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface FetchSubCollectionsProps {
  collectionId: string;
}

export async function fetchSubCollections(
  client: ReplykeHttpClient,
  data: FetchSubCollectionsProps
): Promise<Collection[]> {
  const { collectionId } = data;
  const response = await client.projectInstance.get<Collection[]>(
    `/collections/${collectionId}/sub-collections`
  );
  return response.data;
}
