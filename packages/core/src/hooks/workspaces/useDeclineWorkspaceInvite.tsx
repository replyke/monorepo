import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface DeclineWorkspaceInviteProps {
  inviteId: string;
}

export interface DeclineWorkspaceInviteResponse {
  success: boolean;
}

/**
 * Decline an invitation — identity-matched to the bearer-token user (not
 * verification-gated).
 */
function useDeclineWorkspaceInvite(): (
  props: DeclineWorkspaceInviteProps
) => Promise<DeclineWorkspaceInviteResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const declineWorkspaceInvite = useCallback(
    async ({ inviteId }: DeclineWorkspaceInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!inviteId) {
        throw new Error("Please pass an inviteId");
      }

      const response = await axios.post<DeclineWorkspaceInviteResponse>(
        `/${projectId}/workspace-invites/${inviteId}/decline`,
        {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return declineWorkspaceInvite;
}

export default useDeclineWorkspaceInvite;
