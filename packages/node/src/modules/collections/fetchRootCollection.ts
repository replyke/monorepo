import { SublayHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export interface FetchRootCollectionProps {
  userId: string;
}

export async function fetchRootCollection(
  client: SublayHttpClient,
  data: FetchRootCollectionProps
): Promise<Collection> {
  const response = await client.projectInstance.get<Collection>(
    "/collections/root",
    { params: data }
  );
  return response.data;
}
