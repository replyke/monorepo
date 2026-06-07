import { SublayHttpClient } from "../../core/client";

export interface DeleteFollowProps {
  /** The user being unfollowed (the target). The follower is the token holder. */
  userId: string;
}

export async function deleteFollow(
  client: SublayHttpClient,
  data: DeleteFollowProps
): Promise<void> {
  const { userId } = data;
  await client.projectInstance.delete(`/users/${userId}/follow`);
}
