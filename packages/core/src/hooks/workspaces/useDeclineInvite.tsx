import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface DeclineInviteProps {
  inviteId: string;
}

export interface DeclineInviteResponse {
  success: boolean;
}

/**
 * Decline an invitation — identity-matched to the bearer-token user (not
 * verification-gated).
 */
function useDeclineInvite(): (
  props: DeclineInviteProps
) => Promise<DeclineInviteResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const declineInvite = useCallback(
    async ({ inviteId }: DeclineInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!inviteId) {
        throw new Error("Please pass an inviteId");
      }

      const response = await axios.post<DeclineInviteResponse>(
        `/${projectId}/workspace-invites/${inviteId}/decline`,
        {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return declineInvite;
}

export default useDeclineInvite;
