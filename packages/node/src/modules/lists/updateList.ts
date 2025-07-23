import { ReplykeHttpClient } from "../../core/client";
import { List } from "../../interfaces/List";

export interface UpdateListProps {
  userId: string;
  listId: string;
  update: {
    name: string;
  };
}

export async function updateList(
  client: ReplykeHttpClient,
  data: UpdateListProps
): Promise<List> {
  const { userId, listId, update } = data;
  const path = `/lists/${listId}`;
  const response = await client.projectInstance.patch<List>(path, {
    userId,
    update,
  });
  return response.data;
}
