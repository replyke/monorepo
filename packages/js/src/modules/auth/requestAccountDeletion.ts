import { SublayHttpClient } from "../../core/client";

export interface RequestAccountDeletionResponse {
  success: boolean;
}

/**
 * Step 1 of self-service account deletion. Emails the signed-in user a one-time
 * confirmation code. Pass that code to {@link confirmAccountDeletion} to
 * permanently delete the account.
 *
 * Requires the account to have an email on file — accounts without one (e.g.
 * anonymous or foreign-id users) must be deleted server-side with a service key
 * via the node SDK (`client.users.deleteUser`).
 */
export async function requestAccountDeletion(
  client: SublayHttpClient
): Promise<RequestAccountDeletionResponse> {
  const response =
    await client.projectInstance.post<RequestAccountDeletionResponse>(
      "/auth/request-account-deletion",
      {}
    );
  return response.data;
}
