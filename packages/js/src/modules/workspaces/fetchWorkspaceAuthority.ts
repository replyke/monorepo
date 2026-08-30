import { SublayHttpClient } from "../../core/client";
import { WorkspaceAuthority } from "../../interfaces/Workspace";

export interface FetchWorkspaceAuthorityProps {
  workspaceId: string;
}

/**
 * Authority-as-a-service read — the bearer-token user's resolved standing
 * (`{ reasons, capabilities, permissions, rank }`) on the workspace. A
 * permission check is a one-line `.includes()` on the result.
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
  const { workspaceId } = data;
  const response = await client.projectInstance.get<WorkspaceAuthority>(
    `/workspaces/${workspaceId}/authority/me`
  );
  return response.data;
}
