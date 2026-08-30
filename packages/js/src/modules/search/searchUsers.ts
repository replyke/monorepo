import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface SearchUsersProps {
  query: string;
  limit?: number;
}

export interface UserSearchResult {
  similarity: number;
  record: User;
}

export async function searchUsers(
  client: SublayHttpClient,
  data: SearchUsersProps
): Promise<UserSearchResult[]> {
  const response = await client.projectInstance.post<UserSearchResult[]>(
    "/search/users",
    data
  );
  return response.data;
}
