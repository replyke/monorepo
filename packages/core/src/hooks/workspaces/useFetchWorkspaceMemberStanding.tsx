import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { WorkspaceMemberStanding } from "../../interfaces/models/Workspace";

export interface FetchWorkspaceMemberStandingProps {
  workspaceId: string;
  // The TARGET user whose standing to read — a path param, not an actor. The
  // actor is always the bearer-token user.
  targetUserId: string;
}

/**
 * Read one user's resolved standing on a workspace (`{ user, reasons,
 * capabilities, permissions, rank, relativeRank, title, metadata }`), covering
 * every relation — owner, ancestor-owner, member, reach-holder.
 *
 * `relativeRank` is the target's `rank` as an offset from YOU (negative =
 * senior to you), and is fenced with `rank`: both are absent, not null, for a
 * caller who may not see the target's authority.
 */
function useFetchWorkspaceMemberStanding(): (
  props: FetchWorkspaceMemberStandingProps
) => Promise<WorkspaceMemberStanding> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchWorkspaceMemberStanding = useCallback(
    async ({ workspaceId, targetUserId }: FetchWorkspaceMemberStandingProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!targetUserId) {
        throw new Error("Please pass a targetUserId");
      }

      const response = await axios.get<WorkspaceMemberStanding>(
        `/${projectId}/workspaces/${workspaceId}/members/${targetUserId}`
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchWorkspaceMemberStanding;
}

export default useFetchWorkspaceMemberStanding;
