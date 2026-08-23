import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  Workspace,
  WorkspaceCapability,
} from "../../interfaces/models/Workspace";

export interface TransferWorkspaceOwnershipProps {
  workspaceId: string;
  // The new owner — any verified user in the tenant (need not be a member).
  newOwnerId: string;
  // Disposition of the previous owner. Defaults server-side: an ancestor-owner
  // reassign defaults to "remove"; a voluntary self-transfer is chosen.
  previousOwnerDisposition?: "demote" | "remove";
  // On demote, the ex-owner's rank (defaults to 0 server-side).
  previousOwnerRank?: number;
  previousOwnerCapabilities?: WorkspaceCapability[];
}

/**
 * Hand a workspace to a new owner. The actor is the bearer-token user and must
 * be the workspace's own owner or an ancestor owner.
 */
function useTransferWorkspaceOwnership(): (
  props: TransferWorkspaceOwnershipProps
) => Promise<Workspace> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const transferWorkspaceOwnership = useCallback(
    async ({ workspaceId, ...rest }: TransferWorkspaceOwnershipProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!rest.newOwnerId) {
        throw new Error("Please pass a newOwnerId");
      }

      // `newOwnerId` addresses the TARGET and rides in the body.
      const response = await axios.post<Workspace>(
        `/${projectId}/workspaces/${workspaceId}/transfer-ownership`,
        rest
      );

      return response.data;
    },
    [projectId, axios]
  );

  return transferWorkspaceOwnership;
}

export default useTransferWorkspaceOwnership;
