import { SublayHttpClient } from "../../core/client";

export interface FetchFollowersCountProps {
  userId: string;
}

export interface FollowersCountResponse {
  count: number;
}

export async function fetchFollowersCount(
  client: SublayHttpClient,
  data: FetchFollowersCountProps
): Promise<FollowersCountResponse> {
  const response = await client.projectInstance.get<FollowersCountResponse>(
    "/follows/followers-count",
    { params: data }
  );
  return response.data;
}
