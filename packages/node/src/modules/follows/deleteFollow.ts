import { SublayHttpClient } from "../../core/client";

export interface DeleteFollowByIdProps {
  followId: string;
  userId: string;
}

export async function deleteFollow(
  client: SublayHttpClient,
  data: DeleteFollowByIdProps
): Promise<void> {
  const { followId, userId } = data;
  await client.projectInstance.delete(`/follows/${followId}`, {
    params: { userId },
  });
}
