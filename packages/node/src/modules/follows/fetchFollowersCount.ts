import { ReplykeHttpClient } from "../../core/client";

export interface FollowersCountResponse {
  count: number;
}

export async function fetchFollowersCount(
  client: ReplykeHttpClient
): Promise<FollowersCountResponse> {
  const response = await client.projectInstance.get<FollowersCountResponse>(
    "/follows/followers-count"
  );
  return response.data;
}
