import { SublayHttpClient } from "../../core/client";

export interface DeleteBlockProps {
  /** The user being unblocked (the target). The blocker is the token holder. */
  userId: string;
}

/**
 * DELETE /users/:userId/block — unblock `:userId`.
 *
 * The blocker is derived from the token (Rule A — no `actingUserId`). Idempotent:
 * unblocking a user who isn't blocked succeeds. Restores nothing (torn-down
 * follows/connections are gone for good).
 */
export async function deleteBlock(
  client: SublayHttpClient,
  data: DeleteBlockProps
): Promise<void> {
  const { userId } = data;
  await client.projectInstance.delete(`/users/${userId}/block`);
}
