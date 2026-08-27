import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { UserSearchParams } from "../../interfaces/UserSearch";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowersByUserIdProps
  extends SpaceReputationUserParams,
    UserSearchParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowersByUserId(
  client: SublayHttpClient,
  data: FetchFollowersByUserIdProps
): Promise<PaginatedResponse<User>> {
  const {
    userId,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const response = await client.projectInstance.get<PaginatedResponse<User>>(
    `/users/${userId}/followers`,
    {
      params: {
        ...rest,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
