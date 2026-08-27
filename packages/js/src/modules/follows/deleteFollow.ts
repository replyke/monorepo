import { SublayHttpClient } from "../../core/client";

export interface DeleteFollowByIdProps {
  followId: string;
}

export async function deleteFollow(
  client: SublayHttpClient,
  data: DeleteFollowByIdProps
): Promise<void> {
  const { followId } = data;
  await client.projectInstance.delete(`/follows/${followId}`);
}
