import { SublayHttpClient } from "../../core/client";
import { Connection } from "../../interfaces/Connection";

export interface RequestConnectionProps {
  /**
   * The user the connection is requested with (the target). The requester is
   * the token holder.
   */
  userId: string;
  message?: string;
}

export async function requestConnection(
  client: SublayHttpClient,
  data: RequestConnectionProps
): Promise<Connection> {
  const { userId, ...body } = data;
  const response = await client.projectInstance.post<Connection>(
    `/users/${userId}/connection`,
    body
  );
  return response.data;
}
