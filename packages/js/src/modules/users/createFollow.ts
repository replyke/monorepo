import { SublayHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";

export interface CreateFollowProps {
  /** The user being followed (the target). The follower is the token holder. */
  userId: string;
}

export async function createFollow(
  client: SublayHttpClient,
  data: CreateFollowProps
): Promise<Follow> {
  const { userId } = data;
  const response = await client.projectInstance.post<Follow>(
    `/users/${userId}/follow`,
    {}
  );
  return response.data;
}
