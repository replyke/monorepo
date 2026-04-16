import { ReplykeHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface SearchUsersProps {
  query: string;
  page?: number;
  limit?: number;
}

export async function searchUsers(
  client: ReplykeHttpClient,
  data: SearchUsersProps
): Promise<PaginatedResponse<User>> {
  const response = await client.projectInstance.post<PaginatedResponse<User>>(
    "/search/users",
    data
  );
  return response.data;
}
