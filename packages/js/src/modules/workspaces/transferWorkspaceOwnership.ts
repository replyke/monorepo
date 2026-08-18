import { SublayHttpClient } from "../../core/client";
import { Workspace, WorkspaceCapability } from "../../interfaces/Workspace";

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
 * Hand the workspace to a new owner. Owner-only (own owner or an ancestor
 * owner). The actor is the bearer-token user — no `userId` is sent;
 * `newOwnerId` addresses the TARGET, not the actor.
 */
export async function transferWorkspaceOwnership(
  client: SublayHttpClient,
  data: TransferWorkspaceOwnershipProps
): Promise<Workspace> {
  const { workspaceId, ...rest } = data;

  // Client SDKs never send an actor `userId` — acting on behalf of another
  // user is the node-sdk service-key capability. Strip it defensively in
  // case a caller casts around the props type. (`newOwnerId` is the TARGET
  // and stays.)
  const body: Record<string, any> = { ...rest };
  delete body.userId;

  const response = await client.projectInstance.post<Workspace>(
    `/workspaces/${workspaceId}/transfer-ownership`,
    body
  );
  return response.data;
}
