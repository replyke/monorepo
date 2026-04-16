import { ReplykeHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowersProps {
  page?: number;
  limit?: number;
}

export async function fetchFollowers(
  client: ReplykeHttpClient,
  data: FetchFollowersProps
): Promise<PaginatedResponse<Follow>> {
  const response = await client.projectInstance.get<PaginatedResponse<Follow>>(
    "/follows/followers",
    { params: data }
  );
  return response.data;
}
