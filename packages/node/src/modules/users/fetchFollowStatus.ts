import { ReplykeHttpClient } from "../../core/client";

export interface FetchFollowStatusProps {
  userId: string;
}

export interface FollowStatusResponse {
  isFollowing: boolean;
  followId?: string;
}

export async function fetchFollowStatus(
  client: ReplykeHttpClient,
  data: FetchFollowStatusProps
): Promise<FollowStatusResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<FollowStatusResponse>(
    `/users/${userId}/follow`
  );
  return response.data;
}
