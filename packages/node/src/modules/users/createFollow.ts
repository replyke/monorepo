import { ReplykeHttpClient } from "../../core/client";
import { Follow } from "../../interfaces/Follow";

export interface CreateFollowProps {
  userId: string;
}

export async function createFollow(
  client: ReplykeHttpClient,
  data: CreateFollowProps
): Promise<Follow> {
  const { userId } = data;
  const response = await client.projectInstance.post<Follow>(
    `/users/${userId}/follow`
  );
  return response.data;
}
