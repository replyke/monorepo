import { ReplykeHttpClient } from "../../core/client";
import { ConnectionCountResponse } from "../../interfaces/Connection";

export interface FetchConnectionsCountByUserIdProps {
  userId: string;
}

export async function fetchConnectionsCountByUserId(
  client: ReplykeHttpClient,
  data: FetchConnectionsCountByUserIdProps
): Promise<ConnectionCountResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<ConnectionCountResponse>(
    `/users/${userId}/connections-count`
  );
  return response.data;
}
