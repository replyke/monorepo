import { ReplykeHttpClient } from "../../core/client";

export interface FollowingCountResponse {
  count: number;
}

export async function fetchFollowingCount(
  client: ReplykeHttpClient
): Promise<FollowingCountResponse> {
  const response = await client.projectInstance.get<FollowingCountResponse>(
    "/follows/following-count"
  );
  return response.data;
}
