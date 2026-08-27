import { SublayHttpClient } from "../../core/client";

export interface FetchFollowStatusProps {
  /** The user whose follow relationship is being checked (the target). */
  userId: string;
  /** The user whose perspective the status is from. */
  actingUserId: string;
}

export interface FollowStatusResponse {
  isFollowing: boolean;
  followId?: string;
}

export async function fetchFollowStatus(
  client: SublayHttpClient,
  data: FetchFollowStatusProps
): Promise<FollowStatusResponse> {
  const { userId, actingUserId } = data;
  const response = await client.projectInstance.get<FollowStatusResponse>(
    `/users/${userId}/follow`,
    { params: { actingUserId } }
  );
  return response.data;
}
