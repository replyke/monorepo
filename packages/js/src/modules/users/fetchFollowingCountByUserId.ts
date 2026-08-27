import { SublayHttpClient } from "../../core/client";

export interface FetchFollowingCountByUserIdProps {
  userId: string;
}

export interface FollowingCountResponse {
  count: number;
}

export async function fetchFollowingCountByUserId(
  client: SublayHttpClient,
  data: FetchFollowingCountByUserIdProps
): Promise<FollowingCountResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<FollowingCountResponse>(
    `/users/${userId}/following-count`
  );
  return response.data;
}
