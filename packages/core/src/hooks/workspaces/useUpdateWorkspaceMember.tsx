import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  WorkspaceMember,
  WorkspaceCapability,
} from "../../interfaces/models/Workspace";

export interface UpdateWorkspaceMemberProps {
  workspaceId: string;
  // The TARGET member's user id — a path param, not an actor. The actor is
  // always the bearer-token user.
  targetUserId: string;
  // Powerful fields (require `edit-member-access` + rank rules + no-escalation).
  capabilities?: WorkspaceCapability[];
  permissions?: string[];
  rank?: number;
  // Cosmetic fields (require `edit-member-profile`; own-title needs nothing).
  title?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Edit a direct member's access (capabilities / permissions / rank) and/or
 * profile (title / metadata). The actor is the bearer-token user and is subject
 * to the capability + rank rules on the workspace.
 */
function useUpdateWorkspaceMember(): (
  props: UpdateWorkspaceMemberProps
) => Promise<WorkspaceMember> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const updateWorkspaceMember = useCallback(
    async ({
      workspaceId,
      targetUserId,
      ...rest
    }: UpdateWorkspaceMemberProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!targetUserId) {
        throw new Error("Please pass a targetUserId");
      }

      // On this route the server reads a body `userId` as the ACTOR (the
      // service-key act-as-user path). Client SDKs never send one — the actor
      // is always the bearer-token user — so strip it defensively.
      const body: Record<string, any> = { ...rest };
      delete body.userId;

      const response = await axios.patch<WorkspaceMember>(
        `/${projectId}/workspaces/${workspaceId}/members/${targetUserId}`,
        body
      );

      return response.data;
    },
    [projectId, axios]
  );

  return updateWorkspaceMember;
}

export default useUpdateWorkspaceMember;
