import { ReplykeHttpClient } from "../../core/client";

export interface DeleteListProps {
  userId: string;
  listId: string;
}

export async function deleteList(
  client: ReplykeHttpClient,
  data: DeleteListProps
): Promise<void> {
  const { userId, listId } = data;
  const path = `/lists/${listId}`;
  const response = await client.projectInstance.delete<void>(path, {
    params: { userId },
  });
  return response.data;
}
