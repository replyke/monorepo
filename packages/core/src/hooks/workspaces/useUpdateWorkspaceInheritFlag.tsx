import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Workspace } from "../../interfaces/models/Workspace";

export interface UpdateWorkspaceInheritFlagProps {
  workspaceId: string;
  inheritsFromParent: boolean;
}

/**
 * Flip whether this workspace inherits reach from its parent. Owner-only — the
 * actor (the bearer-token user) must be the workspace's own owner or an
 * ancestor owner.
 */
function useUpdateWorkspaceInheritFlag(): (
  props: UpdateWorkspaceInheritFlagProps
) => Promise<Workspace> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const updateWorkspaceInheritFlag = useCallback(
    async ({
      workspaceId,
      inheritsFromParent,
    }: UpdateWorkspaceInheritFlagProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (typeof inheritsFromParent !== "boolean") {
        throw new Error("Please pass a boolean inheritsFromParent");
      }

      const response = await axios.patch<Workspace>(
        `/${projectId}/workspaces/${workspaceId}/inherit-flag`,
        { inheritsFromParent }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return updateWorkspaceInheritFlag;
}

export default useUpdateWorkspaceInheritFlag;
