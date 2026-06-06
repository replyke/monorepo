import { SublayHttpClient } from "../../core/client";
import { ConnectionStatusResponse } from "../../interfaces/Connection";

export interface FetchConnectionStatusProps {
  /** The other user in the connection (the target). */
  userId: string;
  /** The user whose perspective the status is from. */
  actingUserId: string;
}

export async function fetchConnectionStatus(
  client: SublayHttpClient,
  data: FetchConnectionStatusProps
): Promise<ConnectionStatusResponse> {
  const { userId, actingUserId } = data;
  const response =
    await client.projectInstance.get<ConnectionStatusResponse>(
      `/users/${userId}/connection`,
      { params: { actingUserId } }
    );
  return response.data;
}
