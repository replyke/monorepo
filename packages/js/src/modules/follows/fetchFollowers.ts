import { SublayHttpClient } from "../../core/client";
import { FollowListItem } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowersProps {
  page?: number;
  limit?: number;
}

export async function fetchFollowers(
  client: SublayHttpClient,
  data: FetchFollowersProps
): Promise<PaginatedResponse<FollowListItem>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<FollowListItem>
  >("/follows/followers", { params: data });
  return response.data;
}
