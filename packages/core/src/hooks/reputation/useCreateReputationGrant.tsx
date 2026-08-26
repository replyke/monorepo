import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import {
  ReputationGrant,
  ReputationGrantTargetType,
} from "../../interfaces/models/ReputationGrant";

export interface CreateReputationGrantProps {
  /** The user receiving the reputation. Cannot be the logged-in user. */
  recipientId: string;
  /**
   * Positive integer. A user transfer can never mint (negatives) nor be a
   * no-op (zero) — only an app mint, which is service-key-only and therefore
   * unreachable from this SDK, may be negative.
   */
  amount: number;
  /** The bucket both legs move in. Omitted/null = the project-general bucket. */
  spaceId?: string | null;
  note?: string | null;
  metadata?: Record<string, any> | null;
  /** `targetType` and `targetId` must be supplied together, or not at all. */
  targetType?: ReputationGrantTargetType;
  targetId?: string;
}

/**
 * Transfers reputation from the logged-in user to another user.
 *
 * This is a **debited transfer**: the amount leaves the sender's bucket and
 * lands in the recipient's bucket in the same space — nothing is created. The
 * mint counterpart is service-key-only and lives in `@sublay/node`.
 */
function useCreateReputationGrant(): (
  props: CreateReputationGrantProps
) => Promise<ReputationGrant> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const createReputationGrant = useCallback(
    async (props: CreateReputationGrantProps) => {
      const {
        recipientId,
        amount,
        spaceId,
        note,
        metadata,
        targetType,
        targetId,
      } = props ?? ({} as CreateReputationGrantProps);

      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!recipientId) {
        throw new Error("recipientId is required.");
      }
      if (typeof amount !== "number") {
        throw new Error("amount is required.");
      }
      // Mirrors the server's shared `bothOrNeitherTarget` refinement, so a
      // half-filled target fails locally instead of costing a round trip.
      if (Boolean(targetType) !== Boolean(targetId)) {
        throw new Error("targetType and targetId must be supplied together.");
      }

      const response = await axios.post<ReputationGrant>(
        `/${projectId}/reputation-grants`,
        {
          recipientId,
          amount,
          spaceId,
          note,
          metadata,
          targetType,
          targetId,
        }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return createReputationGrant;
}

export default useCreateReputationGrant;
