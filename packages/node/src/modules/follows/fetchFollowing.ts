import { SublayHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { UserSearchParams } from "../../interfaces/UserSearch";

export interface FetchFollowingProps extends UserSearchParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowing(
  client: SublayHttpClient,
  data: FetchFollowingProps
): Promise<PaginatedResponse<Follow>> {
  const response = await client.projectInstance.get<PaginatedResponse<Follow>>(
    "/follows/following",
    { params: data }
  );
  return response.data;
}
