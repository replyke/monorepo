import { ReplykeHttpClient } from "../../core/client";
import { ConnectionStatusResponse } from "../../interfaces/Connection";

export interface FetchConnectionStatusProps {
  userId: string;
}

export async function fetchConnectionStatus(
  client: ReplykeHttpClient,
  data: FetchConnectionStatusProps
): Promise<ConnectionStatusResponse> {
  const { userId } = data;
  const response =
    await client.projectInstance.get<ConnectionStatusResponse>(
      `/users/${userId}/connection`
    );
  return response.data;
}
