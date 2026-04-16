import { ReplykeHttpClient } from "../../core/client";

export interface DeleteCollectionProps {
  collectionId: string;
}

export async function deleteCollection(
  client: ReplykeHttpClient,
  data: DeleteCollectionProps
): Promise<void> {
  const { collectionId } = data;
  await client.projectInstance.delete(`/collections/${collectionId}`);
}
