import { SublayHttpClient } from "../../core/client";

export interface FetchFollowersCountByUserIdProps {
  userId: string;
}

export interface FollowersCountResponse {
  count: number;
}

export async function fetchFollowersCountByUserId(
  client: SublayHttpClient,
  data: FetchFollowersCountByUserIdProps
): Promise<FollowersCountResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<FollowersCountResponse>(
    `/users/${userId}/followers-count`
  );
  return response.data;
}
