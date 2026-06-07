import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface FetchUserByIdProps {
  userId: string;
  include?: string;
}

export async function fetchUserById(
  client: SublayHttpClient,
  data: FetchUserByIdProps
): Promise<User> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<User>(`/users/${userId}`, {
    params,
  });
  return response.data;
}
