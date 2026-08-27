import { SublayHttpClient } from "../../core/client";

export interface FetchFollowStatusProps {
  /**
   * The user whose follow relationship is being checked (the target). The
   * status is from the perspective of the token holder.
   */
  userId: string;
}

export interface FollowStatusResponse {
  isFollowing: boolean;
  followId?: string;
  followedAt?: string;
}

export async function fetchFollowStatus(
  client: SublayHttpClient,
  data: FetchFollowStatusProps
): Promise<FollowStatusResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<FollowStatusResponse>(
    `/users/${userId}/follow`
  );
  return response.data;
}
