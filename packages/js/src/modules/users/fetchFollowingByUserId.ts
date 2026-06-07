import { SublayHttpClient } from "../../core/client";
import { FollowListItem } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowingByUserIdProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowingByUserId(
  client: SublayHttpClient,
  data: FetchFollowingByUserIdProps
): Promise<PaginatedResponse<FollowListItem>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<FollowListItem>
  >(`/users/${userId}/following`, { params });
  return response.data;
}
