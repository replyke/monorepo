import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowersByUserIdProps extends SpaceReputationUserParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowersByUserId(
  client: SublayHttpClient,
  data: FetchFollowersByUserIdProps
): Promise<PaginatedResponse<User>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<User>>(
    `/users/${userId}/followers`,
    { params }
  );
  return response.data;
}
