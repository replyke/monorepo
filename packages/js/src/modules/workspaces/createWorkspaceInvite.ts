import { SublayHttpClient } from "../../core/client";
import {
  WorkspaceCapability,
  WorkspaceInvitation,
} from "../../interfaces/Workspace";

export interface CreateWorkspaceInviteProps {
  workspaceId: string;
  // Address the invitee by exactly one of: `email`, `userId`, or `username`.
  // (Here `userId` is the INVITE TARGET, not the actor — the inviter is the
  // bearer-token user.)
  email?: string;
  userId?: string;
  username?: string;
  capabilities?: WorkspaceCapability[];
  permissions?: string[];
  /**
   * The invited rank, ABSOLUTE — a position on this workspace's ladder (smaller
   * = more senior). The escape hatch, and what tier-constant apps want, since
   * they compute the number anyway.
   *
   * Optional, and mutually exclusive with `relativeRank` — sending both is a
   * 400. Sending NEITHER defaults to `relativeRank: 1`, one rung below the
   * inviter, which is well defined for every actor and can never fail the rank
   * floor.
   *
   * ⚠️ That default is for a NEW invitation. Re-inviting a target who already
   * has a live pending invite updates it in place, and there omitting both rank
   * fields PRESERVES the stored rank instead of re-defaulting it. See the
   * function doc below.
   */
  rank?: number;
  /**
   * The invited rank, RELATIVE to the inviter: `1` = one rung below me, `2` =
   * two rungs below, and so on. The documented happy path — every governance
   * rule about rank is relative, so this is what callers usually mean.
   *
   * Must be `>= 1` on a write. `0` would mean "a peer", which the assign rule
   * forbids (you cannot clone your own authority), and a negative offset would
   * mint someone senior to you; both are a 400. Both rank fields are also capped at `2147483647` (int4), and the RESOLVED sum is bounded too — an in-range anchor plus an in-range offset can still overflow, which is a 400 rather than a 500.
   *
   * The anchor is the inviter's OWN rank if they hold a member row on this
   * workspace, and apex (one step above rank 0) if they do not — so an owner's
   * `relativeRank: 1` lands on rank 0, while a rank-3 member's lands on rank 4.
   *
   * ⚠️ A SNAPSHOT, not a live link: the offset is resolved to an absolute rank
   * once, at invite time, and frozen. It does not track the inviter's later
   * promotions or demotions.
   */
  relativeRank?: number;
  title?: string | null;
}

/**
 * Create an invitation (requires the `invite` capability on the workspace). The
 * inviter is the bearer-token user.
 *
 * The invited rank comes in either coordinate — `rank` (absolute) or
 * `relativeRank` (an offset from the inviter) — never both. Omitting both
 * defaults to `relativeRank: 1`, one rung below the inviter, which is the
 * documented happy path and can never fail the rank floor.
 *
 * ⚠️ This route doubles as an UPSERT, and the default above applies only to a
 * NEW invitation. Re-inviting a target who already holds a live pending invite
 * refreshes THAT invitation in place — same id, expiry reset — and on that
 * branch an omitted grant field is PRESERVED, not re-defaulted or blanked:
 * `rank`, `capabilities`, `permissions` and `title` all keep their stored
 * values. A "Resend invitation" button that posts only the address therefore
 * cannot silently re-rank the invitee to one below whoever clicked it. An
 * explicit value still overwrites, and an explicit `relativeRank` re-resolves
 * against the CURRENT caller. Full semantics:
 * https://docs.sublay.io/api-reference/workspaces/invitations/create-invite
 */
export async function createWorkspaceInvite(
  client: SublayHttpClient,
  data: CreateWorkspaceInviteProps
): Promise<WorkspaceInvitation> {
  const { workspaceId, ...body } = data;
  const response = await client.projectInstance.post<WorkspaceInvitation>(
    `/workspaces/${workspaceId}/invites`,
    body
  );
  return response.data;
}
