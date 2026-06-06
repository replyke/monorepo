import { SublayHttpClient } from "../../core/client";

export interface FetchFollowingCountProps {
  userId: string;
}

export interface FollowingCountResponse {
  count: number;
}

export async function fetchFollowingCount(
  client: SublayHttpClient,
  data: FetchFollowingCountProps
): Promise<FollowingCountResponse> {
  const response = await client.projectInstance.get<FollowingCountResponse>(
    "/follows/following-count",
    { params: data }
  );
  return response.data;
}
