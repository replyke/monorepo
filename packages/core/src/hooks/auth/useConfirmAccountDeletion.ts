import { useCallback } from "react";
import { useSublayDispatch } from "../../store/hooks";
import { confirmAccountDeletionThunk } from "../../store/slices/authThunks";
import useProject from "../projects/useProject";

export interface ConfirmAccountDeletionProps {
  /** The one-time code emailed by `useRequestAccountDeletion`. */
  code: string;
}

/**
 * Step 2 of self-service account deletion. Verifies the emailed code and then
 * permanently deletes the signed-in user's account (same cascade as the
 * admin/service delete). On success the local session is torn down like a
 * sign-out — the deleted account is removed from the multi-account map and the
 * SDK switches to a remaining account if there is one. This is immediate and
 * cannot be undone.
 */
function useConfirmAccountDeletion(): (
  props: ConfirmAccountDeletionProps
) => Promise<void> {
  const { projectId } = useProject();
  const dispatch = useSublayDispatch();

  const confirmAccountDeletion = useCallback(
    async ({ code }: ConfirmAccountDeletionProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!code?.trim()) {
        throw new Error("Confirmation code is required.");
      }

      const result = await dispatch(
        confirmAccountDeletionThunk({ projectId, code: code.trim() })
      );

      if (confirmAccountDeletionThunk.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
    },
    [projectId, dispatch]
  );

  return confirmAccountDeletion;
}

export default useConfirmAccountDeletion;
