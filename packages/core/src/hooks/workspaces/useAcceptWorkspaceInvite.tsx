import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface AcceptWorkspaceInviteProps {
  inviteId: string;
}

export interface AcceptWorkspaceInviteResponse {
  success: boolean;
  workspaceId: string;
}

/**
 * Accept an invitation — identity-matched to the bearer-token user + verified
 * email required. Non-secret id. Idempotent when already a member/owner.
 */
function useAcceptWorkspaceInvite(): (
  props: AcceptWorkspaceInviteProps
) => Promise<AcceptWorkspaceInviteResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const acceptWorkspaceInvite = useCallback(
    async ({ inviteId }: AcceptWorkspaceInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!inviteId) {
        throw new Error("Please pass an inviteId");
      }

      const response = await axios.post<AcceptWorkspaceInviteResponse>(
        `/${projectId}/workspace-invites/${inviteId}/accept`,
        {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return acceptWorkspaceInvite;
}

export default useAcceptWorkspaceInvite;
