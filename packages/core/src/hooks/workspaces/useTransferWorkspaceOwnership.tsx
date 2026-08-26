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
  // On demote, the ex-owner's ABSOLUTE rank. Omit it and the server defaults to
  // ONE RUNG BELOW YOU — not a hardcoded 0.
  //
  // For the usual apex actor (this workspace's own owner, or an ancestor owner
  // who holds no member row here) that still resolves to rank 0, exactly as
  // before. But an ancestor owner who ALSO sits in THIS node's ladder anchors on
  // that row, so their default is `theirRank + 1` — seating the outgoing owner
  // just below themselves rather than silently above them. Same anchor rule the
  // invite default uses: your row here if you hold one, apex otherwise.
  //
  // No relative form on this route (the actor is nearly always apex, so it would
  // buy nothing); an explicit value here is absolute and is NOT rank-floored.
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
