import { SublayHttpClient } from "../../core/client";
import { ConnectionStatusResponse } from "../../interfaces/Connection";

export interface FetchConnectionStatusProps {
  /**
   * The other user in the connection (the target). The status is from the
   * perspective of the token holder.
   */
  userId: string;
}

export async function fetchConnectionStatus(
  client: SublayHttpClient,
  data: FetchConnectionStatusProps
): Promise<ConnectionStatusResponse> {
  const { userId } = data;
  const response =
    await client.projectInstance.get<ConnectionStatusResponse>(
      `/users/${userId}/connection`
    );
  return response.data;
}
