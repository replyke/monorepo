import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface TransferWorkspaceOwnershipProps {
  workspaceId: string;
  // The acting user (own owner or an ancestor owner). Required for the service
  // key (act-as-user).
  actingUserId: string;
  // The new owner — any verified user in the tenant (need not be a member).
  newOwnerId: string;
  // Disposition of the previous owner. Defaults server-side: an ancestor-owner
  // reassign defaults to "remove"; a voluntary self-transfer is chosen.
  previousOwnerDisposition?: "demote" | "remove";
  // On demote, the ex-owner's ABSOLUTE rank. Omit it and the server defaults to
  // ONE RUNG BELOW THE ACTING USER — not a hardcoded 0.
  //
  // ⚠️ The anchor is `actingUserId`'s standing on THIS workspace, so which
  // number you get depends on who you named. Naming a true owner, or an ancestor
  // owner with no member row here, anchors at apex and yields rank 0 exactly as
  // before. Naming an ancestor owner who ALSO holds a row in this node's ladder
  // anchors on that row and yields `theirRank + 1` — seating the outgoing owner
  // just below them rather than silently above them. Same anchor rule the invite
  // default uses: their row here if they hold one, apex otherwise.
  //
  // No relative form on this route; an explicit value here is absolute and is
  // NOT rank-floored.
  previousOwnerRank?: number;
  previousOwnerCapabilities?: string[];
}

export async function transferWorkspaceOwnership(
  client: SublayHttpClient,
  data: TransferWorkspaceOwnershipProps
): Promise<Workspace> {
  const { workspaceId, ...body } = data;
  const response = await client.projectInstance.post<Workspace>(
    `/workspaces/${workspaceId}/transfer-ownership`,
    body
  );
  return response.data;
}
