import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowingByUserIdProps extends SpaceReputationUserParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowingByUserId(
  client: SublayHttpClient,
  data: FetchFollowingByUserIdProps
): Promise<PaginatedResponse<User>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<User>>(
    `/users/${userId}/following`,
    { params }
  );
  return response.data;
}
