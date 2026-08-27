import { SublayHttpClient } from "../../core/client";

export interface DeleteUserProps {
  /** The user to delete. */
  userId: string;
}

/**
 * Permanently deletes a user and cascades cleanup across all their related
 * records (reactions, files, follows, connections, notifications, collections,
 * reports, mentions, embeddings, and hollows out their entities/comments) —
 * matching the dashboard's full-cascade delete. Service/master key only.
 */
export async function deleteUser(
  client: SublayHttpClient,
  data: DeleteUserProps
): Promise<void> {
  const { userId } = data;
  await client.projectInstance.delete(`/users/${userId}`);
}
