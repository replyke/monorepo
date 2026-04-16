import { ReplykeHttpClient } from "../../core/client";
import { RemoveConnectionByUserIdResponse } from "../../interfaces/Connection";

export interface RemoveConnectionByUserIdProps {
  userId: string;
}

export async function removeConnectionByUserId(
  client: ReplykeHttpClient,
  data: RemoveConnectionByUserIdProps
): Promise<RemoveConnectionByUserIdResponse> {
  const { userId } = data;
  const response =
    await client.projectInstance.delete<RemoveConnectionByUserIdResponse>(
      `/users/${userId}/connection`
    );
  return response.data;
}
