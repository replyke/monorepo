import { SublayHttpClient } from "../../core/client";
import { RemoveConnectionByUserIdResponse } from "../../interfaces/Connection";

export interface RemoveConnectionByUserIdProps {
  /**
   * The other user in the connection (the target). The token holder is the
   * user withdrawing/declining/disconnecting.
   */
  userId: string;
}

export async function removeConnectionByUserId(
  client: SublayHttpClient,
  data: RemoveConnectionByUserIdProps
): Promise<RemoveConnectionByUserIdResponse> {
  const { userId } = data;
  const response =
    await client.projectInstance.delete<RemoveConnectionByUserIdResponse>(
      `/users/${userId}/connection`
    );
  return response.data;
}
