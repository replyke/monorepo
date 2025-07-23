import { ReplykeHttpClient } from "../../core/client";
import { List } from "../../interfaces/List";

export interface CreateNewListProps {
  userId: string;
  name: string;
  listId: string;
  listName: string;
}

export async function createNewList(
  client: ReplykeHttpClient,
  data: CreateNewListProps
): Promise<List> {
  const { userId, listId, listName } = data;
  const path = `/lists/${listId}`;
  const response = await client.projectInstance.post<List>(path, {
    userId,
    listName,
  });
  return response.data;
}
