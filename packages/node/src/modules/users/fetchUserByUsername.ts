import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";

export interface FetchUserByUsernameProps extends SpaceReputationUserParams {
  username: string;
  include?: string;
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
