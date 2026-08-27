import { SublayHttpClient } from "../../core/client";

export interface DeleteBlockProps {
  /** The user being unblocked (the target). */
  userId: string;
  /** The user performing the unblock (the blocker). */
  actingUserId: string;
}

export async function deleteBlock(
  client: SublayHttpClient,
  data: DeleteBlockProps
): Promise<void> {
  const { userId, actingUserId } = data;
  await client.projectInstance.delete(`/users/${userId}/block`, {
    params: { actingUserId },
  });
}
