import { useCallback } from "react";
import axios from "../../config/axios";
import useProject from "../projects/useProject";

/**
 * Step 1 of self-service account deletion. Emails the signed-in user a one-time
 * confirmation code. Pass that code to `useConfirmAccountDeletion` to
 * permanently delete the account.
 *
 * Requires the account to have an email on file — accounts without one (e.g.
 * anonymous or foreign-id users) must be deleted server-side with a service key
 * via the node SDK.
 */
function useRequestAccountDeletion(): () => Promise<{ success: boolean }> {
  const { projectId } = useProject();

  const requestAccountDeletion = useCallback(async () => {
    if (!projectId) {
      throw new Error("No projectId available.");
    }

    const response = await axios.post(
      `/${projectId}/auth/request-account-deletion`,
      {}
    );

    return response.data;
  }, [projectId]);

  return requestAccountDeletion;
}

export default useRequestAccountDeletion;
