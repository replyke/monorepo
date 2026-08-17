import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  WorkspaceInvitation,
  WorkspaceCapability,
} from "../../interfaces/models/Workspace";

export interface CreateWorkspaceInviteProps {
  workspaceId: string;
  // Address the invitee by exactly one of: `email`, `userId`, or `username`.
  // (Here `userId` is the INVITE TARGET, not the actor — the inviter is the
  // bearer-token user.)
  email?: string;
  userId?: string;
  username?: string;
  capabilities?: WorkspaceCapability[];
  permissions?: string[];
  rank: number;
  title?: string | null;
}

/**
 * Create an invitation (requires the `invite` capability on the workspace). The
 * inviter is the bearer-token user.
 */
function useCreateWorkspaceInvite(): (
  props: CreateWorkspaceInviteProps
) => Promise<WorkspaceInvitation> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const createWorkspaceInvite = useCallback(
    async ({ workspaceId, ...body }: CreateWorkspaceInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const response = await axios.post<WorkspaceInvitation>(
        `/${projectId}/workspaces/${workspaceId}/invites`,
        body
      );

      return response.data;
    },
    [projectId, axios]
  );

  return createWorkspaceInvite;
}

export default useCreateWorkspaceInvite;
