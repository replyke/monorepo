import { SublayHttpClient } from "../../core/client";

export interface ConfirmAccountDeletionProps {
  /** The one-time code emailed by {@link requestAccountDeletion}. */
  code: string;
}

/**
 * Step 2 of self-service account deletion. Verifies the emailed code and then
 * permanently deletes the signed-in user's account (same cascade as the
 * admin/service delete). This is immediate and cannot be undone.
 */
export async function confirmAccountDeletion(
  client: SublayHttpClient,
  data: ConfirmAccountDeletionProps
): Promise<void> {
  await client.projectInstance.post("/auth/confirm-account-deletion", data);
}
