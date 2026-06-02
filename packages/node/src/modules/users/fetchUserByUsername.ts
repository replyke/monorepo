import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface FetchUserByUsernameProps {
  username: string;
}

export async function fetchUserByUsername(
  client: SublayHttpClient,
  data: FetchUserByUsernameProps
): Promise<User> {
  const response = await client.projectInstance.get<User>("/users/by-username", {
    params: data,
  });
  return response.data;
}
