import { SublayHttpClient } from "../../core/client";
import { RemoveConnectionByUserIdResponse } from "../../interfaces/Connection";

export interface RemoveConnectionByUserIdProps {
  /** The other user in the connection (the target). */
  userId: string;
  /** The user withdrawing/declining the connection. */
  actingUserId: string;
}

export async function removeConnectionByUserId(
  client: SublayHttpClient,
  data: RemoveConnectionByUserIdProps
): Promise<RemoveConnectionByUserIdResponse> {
  const { userId, actingUserId } = data;
  const response =
    await client.projectInstance.delete<RemoveConnectionByUserIdResponse>(
      `/users/${userId}/connection`,
      { params: { actingUserId } }
    );
  return response.data;
}
