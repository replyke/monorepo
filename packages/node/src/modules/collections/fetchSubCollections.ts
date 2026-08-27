import { SublayHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface FetchSubCollectionsProps {
  collectionId: string;
  userId: string;
}

export async function fetchSubCollections(
  client: SublayHttpClient,
  data: FetchSubCollectionsProps
): Promise<Collection[]> {
  const { collectionId, ...params } = data;
  const response = await client.projectInstance.get<Collection[]>(
    `/collections/${collectionId}/sub-collections`,
    { params }
  );
  return response.data;
}
