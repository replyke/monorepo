import { SublayHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";

export interface CreateFollowProps {
  /** The user being followed (the target). */
  userId: string;
  /** The user performing the follow (the follower). */
  actingUserId: string;
}

export async function createFollow(
  client: SublayHttpClient,
  data: CreateFollowProps
): Promise<Follow> {
  const { userId, actingUserId } = data;
  const response = await client.projectInstance.post<Follow>(
    `/users/${userId}/follow`,
    { actingUserId }
  );
  return response.data;
}
