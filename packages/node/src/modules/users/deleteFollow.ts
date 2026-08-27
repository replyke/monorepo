import { SublayHttpClient } from "../../core/client";

export interface DeleteFollowProps {
  /** The user being unfollowed (the target). */
  userId: string;
  /** The user performing the unfollow (the follower). */
  actingUserId: string;
}

export async function deleteFollow(
  client: SublayHttpClient,
  data: DeleteFollowProps
): Promise<void> {
  const { userId, actingUserId } = data;
  await client.projectInstance.delete(`/users/${userId}/follow`, {
    params: { actingUserId },
  });
}
