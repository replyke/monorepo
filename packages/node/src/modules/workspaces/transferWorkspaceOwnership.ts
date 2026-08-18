import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface TransferWorkspaceOwnershipProps {
  workspaceId: string;
  // The acting user (own owner or an ancestor owner). Required for the service
  // key (act-as-user).
  userId: string;
  // The new owner — any verified user in the tenant (need not be a member).
  newOwnerId: string;
  // Disposition of the previous owner. Defaults server-side: an ancestor-owner
  // reassign defaults to "remove"; a voluntary self-transfer is chosen.
  previousOwnerDisposition?: "demote" | "remove";
  // On demote, the ex-owner's rank (defaults to 0 server-side).
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
