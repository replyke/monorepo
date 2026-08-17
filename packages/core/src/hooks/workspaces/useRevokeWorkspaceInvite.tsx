import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface RevokeWorkspaceInviteProps {
  workspaceId: string;
  inviteId: string;
}

export interface RevokeWorkspaceInviteResponse {
  success: boolean;
}

/**
 * Revoke a pending invitation. Requires the `invite` capability (or owner).
 * Note this is a POST to `.../invites/:inviteId/revoke`, not a DELETE.
 */
function useRevokeWorkspaceInvite(): (
  props: RevokeWorkspaceInviteProps
) => Promise<RevokeWorkspaceInviteResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const revokeWorkspaceInvite = useCallback(
    async ({ workspaceId, inviteId }: RevokeWorkspaceInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!inviteId) {
        throw new Error("Please pass an inviteId");
      }

      const response = await axios.post<RevokeWorkspaceInviteResponse>(
        `/${projectId}/workspaces/${workspaceId}/invites/${inviteId}/revoke`,
        {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return revokeWorkspaceInvite;
}

export default useRevokeWorkspaceInvite;
