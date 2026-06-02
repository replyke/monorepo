import { SublayHttpClient } from "../../core/client";

export interface FollowingCountResponse {
  count: number;
}

export async function fetchFollowingCount(
  client: SublayHttpClient
): Promise<FollowingCountResponse> {
  const response = await client.projectInstance.get<FollowingCountResponse>(
    "/follows/following-count"
  );
  return response.data;
}
