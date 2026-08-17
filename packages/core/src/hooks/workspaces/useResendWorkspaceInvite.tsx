import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { WorkspaceInvitation } from "../../interfaces/models/Workspace";

export interface ResendWorkspaceInviteProps {
  workspaceId: string;
  inviteId: string;
}

/**
 * Resend / refresh a pending invitation — valid on any `pending` invite, even
 * one past `expiresAt`; resets a 14-day expiry and resends the email. A
 * terminal invite (accepted/declined/revoked) → 409. Requires the `invite`
 * capability (or owner). Note this is a POST to `.../invites/:inviteId/resend`.
 */
function useResendWorkspaceInvite(): (
  props: ResendWorkspaceInviteProps
) => Promise<WorkspaceInvitation> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const resendWorkspaceInvite = useCallback(
    async ({ workspaceId, inviteId }: ResendWorkspaceInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!inviteId) {
        throw new Error("Please pass an inviteId");
      }

      const response = await axios.post<WorkspaceInvitation>(
        `/${projectId}/workspaces/${workspaceId}/invites/${inviteId}/resend`,
        {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return resendWorkspaceInvite;
}

export default useResendWorkspaceInvite;
