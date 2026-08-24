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
  /**
   * `rank`'s relative twin: an offset from the ACTOR (`1` = one rung below me),
   * resolved to an absolute rank at write time and stored absolute. Must be
   * `>= 1`; mutually exclusive with `rank` (sending both is a 400).
   *
   * The anchor is the actor's own rank if they hold a member row on this
   * workspace, apex otherwise. A SNAPSHOT — frozen at write time, it does not
   * follow the actor's own rank afterwards.
   *
   * Unlike invite, edit has NO default: omitting BOTH still means "rank
   * unchanged", so editing someone's capabilities never moves them on the
   * ladder.
   */
  relativeRank?: number;
  // Cosmetic fields (require `edit-member-profile`; own-title needs nothing).
  title?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Edit a direct member's access (capabilities / permissions / rank) and/or
 * profile (title / metadata). The actor is the bearer-token user and is subject
 * to the capability + rank rules on the workspace.
 *
 * Rank moves in either coordinate — `rank` (absolute) or `relativeRank` (an
 * offset from the actor) — never both. Omitting both leaves rank UNCHANGED;
 * unlike invite, edit has no value default.
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

      const response = await axios.patch<WorkspaceMember>(
        `/${projectId}/workspaces/${workspaceId}/members/${targetUserId}`,
        rest
      );

      return response.data;
    },
    [projectId, axios]
  );

  return updateWorkspaceMember;
}

export default useUpdateWorkspaceMember;
