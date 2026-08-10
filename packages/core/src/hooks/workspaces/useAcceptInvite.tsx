import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface AcceptInviteProps {
  inviteId: string;
}

export interface AcceptInviteResponse {
  success: boolean;
  workspaceId: string;
}

/**
 * Accept an invitation — identity-matched to the bearer-token user + verified
 * email required. Non-secret id. Idempotent when already a member/owner.
 */
function useAcceptInvite(): (
  props: AcceptInviteProps
) => Promise<AcceptInviteResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const acceptInvite = useCallback(
    async ({ inviteId }: AcceptInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!inviteId) {
        throw new Error("Please pass an inviteId");
      }

      const response = await axios.post<AcceptInviteResponse>(
        `/${projectId}/workspace-invites/${inviteId}/accept`,
        {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return acceptInvite;
}

export default useAcceptInvite;
