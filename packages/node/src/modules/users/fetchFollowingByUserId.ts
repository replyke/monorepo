import { ReplykeHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowingByUserIdProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowingByUserId(
  client: ReplykeHttpClient,
  data: FetchFollowingByUserIdProps
): Promise<PaginatedResponse<User>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<User>>(
    `/users/${userId}/following`,
    { params }
  );
  return response.data;
}
