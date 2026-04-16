import { ReplykeHttpClient } from "../../core/client";
import { Collection } from "../../interfaces/Collection";

export async function fetchRootCollection(
  client: ReplykeHttpClient
): Promise<Collection> {
  const response = await client.projectInstance.get<Collection>(
    "/collections/root"
  );
  return response.data;
}
