import { SublayHttpClient } from "../../core/client";
import { FollowListItem } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { UserSearchParams } from "../../interfaces/UserSearch";

export interface FetchFollowingProps extends UserSearchParams {
  page?: number;
  limit?: number;
}

export async function fetchFollowing(
  client: SublayHttpClient,
  data: FetchFollowingProps
): Promise<PaginatedResponse<FollowListItem>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<FollowListItem>
  >("/follows/following", { params: data });
  return response.data;
}
