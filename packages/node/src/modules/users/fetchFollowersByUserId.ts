import { ReplykeHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchFollowersByUserIdProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchFollowersByUserId(
  client: ReplykeHttpClient,
  data: FetchFollowersByUserIdProps
): Promise<PaginatedResponse<User>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<User>>(
    `/users/${userId}/followers`,
    { params }
  );
  return response.data;
}
