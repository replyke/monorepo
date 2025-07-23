import { ReplykeHttpClient } from "../../core/client";
import { List } from "../../interfaces/List";

export interface RemoveEntityFromListProps {
  userId: string;
  listId: string;
  entityId: string;
}

export async function removeEntityFromList(
  client: ReplykeHttpClient,
  data: RemoveEntityFromListProps
): Promise<List> {
  const { userId, listId, entityId } = data;
  const path = `/lists/${listId}/remove-entity`;
  const response = await client.projectInstance.patch<List>(path, {
    userId,
    entityId,
  });
  return response.data;
}
