import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface FetchUserByIdProps {
  userId: string;
}

export async function fetchUserById(
  client: SublayHttpClient,
  data: FetchUserByIdProps
): Promise<User> {
  const path = `/users/${data.userId}`; // assuming client handles prefix like /{projectId}
  const response = await client.projectInstance.get<User>(path);
  return response.data;
}
