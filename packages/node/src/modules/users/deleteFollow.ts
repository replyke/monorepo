import { ReplykeHttpClient } from "../../core/client";

export interface DeleteFollowProps {
  userId: string;
}

export async function deleteFollow(
  client: ReplykeHttpClient,
  data: DeleteFollowProps
): Promise<void> {
  const { userId } = data;
  await client.projectInstance.delete(`/users/${userId}/follow`);
}
