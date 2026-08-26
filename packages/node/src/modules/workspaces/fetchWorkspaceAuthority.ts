import { SublayHttpClient } from "../../core/client";
import { WorkspaceAuthority } from "../../interfaces/Workspace";

export interface FetchWorkspaceAuthorityProps {
  workspaceId: string;
  // The acting user whose resolved standing to read (the service-key
  // `?actingUserId=` variant); required here.
  actingUserId: string;
}

/**
 * Authority-as-a-service read — the resolved standing
 * (`{ reasons, capabilities, permissions, rank }`) for the given user on the
 * workspace. A permission check is a one-line `.includes()` on the result;
 * Sublay never consumes the developer's opaque permissions.
 *
 * ⚠️ No `relativeRank` on this read. It is an offset from the caller, and here
 * the caller IS the subject — so it could only ever be `0`. `rank` is the only
 * rank coordinate this endpoint exposes. `relativeRank` is meaningful on the
 * roster and member-standing reads, where the subject is somebody else.
 */
export async function fetchWorkspaceAuthority(
  client: SublayHttpClient,
  data: FetchWorkspaceAuthorityProps
): Promise<WorkspaceAuthority> {
  const { workspaceId, actingUserId } = data;
  const response = await client.projectInstance.get<WorkspaceAuthority>(
    `/workspaces/${workspaceId}/authority/me`,
    { params: { actingUserId } }
  );
  return response.data;
}
