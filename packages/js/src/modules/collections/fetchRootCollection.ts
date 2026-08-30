import { SublayHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export async function fetchRootCollection(
  client: SublayHttpClient
): Promise<Collection> {
  const response = await client.projectInstance.get<Collection>(
    "/collections/root"
  );
  return response.data;
}
