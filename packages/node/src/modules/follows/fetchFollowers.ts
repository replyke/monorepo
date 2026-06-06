import { SublayHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowersProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowers(
  client: SublayHttpClient,
  data: FetchFollowersProps
): Promise<PaginatedResponse<Follow>> {
  const response = await client.projectInstance.get<PaginatedResponse<Follow>>(
    "/follows/followers",
    { params: data }
  );
  return response.data;
}
