import { ReplykeHttpClient } from "../../core/client";
import { List } from "../../interfaces/List";

export interface FetchSubListsProps {
  userId: string;
  listId: string;
}

export async function fetchSubLists(
  client: ReplykeHttpClient,
  data: FetchSubListsProps
): Promise<List[]> {
  const { userId, listId } = data;
  const path = `/lists/${listId}/sub-lists`;
  const response = await client.projectInstance.get<List[]>(path, {
    params: { userId },
  });
  return response.data;
}
