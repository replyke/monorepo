import { ReplykeHttpClient } from "../../core/client";
import { List } from "../../interfaces/List";

export interface FetchRootListProps {
  userId: string;
}
export async function fetchRootList(
  client: ReplykeHttpClient,
  data: FetchRootListProps
): Promise<List> {
  const path = `/lists/root`;
  const response = await client.projectInstance.get<List>(path, {
    params: data,
  });
  return response.data;
}
