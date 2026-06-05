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
  const path = `/users/${userId}`; // assuming client handles prefix like /{projectId}
  const response = await client.projectInstance.get<User>(path, { params });
  return response.data;
}
