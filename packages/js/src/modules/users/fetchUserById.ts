import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";

export interface FetchUserByIdProps extends SpaceReputationUserParams {
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
