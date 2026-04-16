import { ReplykeHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowingProps {
  page?: number;
  limit?: number;
}

export async function fetchFollowing(
  client: ReplykeHttpClient,
  data: FetchFollowingProps
): Promise<PaginatedResponse<Follow>> {
  const response = await client.projectInstance.get<PaginatedResponse<Follow>>(
    "/follows/following",
    { params: data }
  );
  return response.data;
}
