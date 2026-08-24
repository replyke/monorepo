import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  WorkspaceInvitation,
  WorkspaceCapability,
} from "../../interfaces/models/Workspace";

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
   */
  rank?: number;
  /**
   * The invited rank, RELATIVE to the inviter: `1` = one rung below me, `2` =
   * two rungs below, and so on. The documented happy path — every governance
   * rule about rank is relative, so this is what callers usually mean.
   *
   * Must be `>= 1` on a write. `0` would mean "a peer", which the assign rule
   * forbids (you cannot clone your own authority), and a negative offset would
   * mint someone senior to you; both are a 400.
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
 */
function useCreateWorkspaceInvite(): (
  props: CreateWorkspaceInviteProps
) => Promise<WorkspaceInvitation> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const createWorkspaceInvite = useCallback(
    async ({ workspaceId, ...body }: CreateWorkspaceInviteProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const response = await axios.post<WorkspaceInvitation>(
        `/${projectId}/workspaces/${workspaceId}/invites`,
        body
      );

      return response.data;
    },
    [projectId, axios]
  );

  return createWorkspaceInvite;
}

export default useCreateWorkspaceInvite;
