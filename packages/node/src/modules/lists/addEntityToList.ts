import { ReplykeHttpClient } from "../../core/client";
import { List } from "../../interfaces/List";

export interface AddEntityToListProps {
  userId: string;
  listId: string;
  entityId: string;
}

export async function addEntityToList(
  client: ReplykeHttpClient,
  data: AddEntityToListProps
): Promise<List> {
  const { userId, listId, entityId } = data;
  const path = `/lists/${listId}/add-entity`;
  const response = await client.projectInstance.patch<List>(path, {
    userId,
    entityId,
  });
  return response.data;
}
