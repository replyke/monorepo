import { SublayHttpClient } from "../../core/client";
import { WorkspaceMember } from "../../interfaces/Workspace";

export interface UpdateWorkspaceMemberProps {
  workspaceId: string;
  // The target member's user id (path param).
  targetUserId: string;
  // The acting user. Required for the service key (act-as-user). NOTE: this is
  // sent as `actingUserId` in the body — on this route the path `:userId`
  // addresses the target, and the body `actingUserId` addresses the actor.
  actingUserId: string;
  // Powerful fields (require `edit-member-access` + rank rules + no-escalation).
  capabilities?: string[];
  permissions?: string[];
  rank?: number;
  /**
   * `rank`'s relative twin: an offset from the ACTOR — `actingUserId` on this
   * route, not the key — where `1` = one rung below them. Resolved to an
   * absolute rank at write time and stored absolute. Must be `>= 1`; mutually
   * exclusive with `rank` (sending both is a 400). Both rank fields are also capped at `2147483647` (int4), and the RESOLVED sum is bounded too — an in-range anchor plus an in-range offset can still overflow, which is a 400 rather than a 500.
   *
   * The anchor is that user's own rank if they hold a member row on this
   * workspace, apex otherwise — so acting as the owner resolves
   * `relativeRank: 1` to rank 0. A SNAPSHOT — frozen at write time, it does not
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
 * Edit a member's grant / profile. Powerful fields need `edit-member-access`
 * plus the rank + no-escalation rules; cosmetic fields need only
 * `edit-member-profile`.
 *
 * Rank moves in either coordinate — `rank` (absolute) or `relativeRank` (an
 * offset from the actor) — never both. Omitting both leaves rank UNCHANGED;
 * unlike invite, edit has no value default.
 */
export async function updateWorkspaceMember(
  client: SublayHttpClient,
  data: UpdateWorkspaceMemberProps
): Promise<WorkspaceMember> {
  const { workspaceId, targetUserId, ...body } = data;
  const response = await client.projectInstance.patch<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${targetUserId}`,
    body
  );
  return response.data;
}
