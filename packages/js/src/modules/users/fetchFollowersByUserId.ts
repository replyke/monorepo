import { SublayHttpClient } from "../../core/client";
import { FollowListItem } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";

export interface FetchFollowersByUserIdProps extends SpaceReputationUserParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowersByUserId(
  client: SublayHttpClient,
  data: FetchFollowersByUserIdProps
): Promise<PaginatedResponse<FollowListItem>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<FollowListItem>
  >(`/users/${userId}/followers`, { params });
  return response.data;
}
