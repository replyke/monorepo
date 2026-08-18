import { User } from "./User";

/**
 * Workspaces bundle interfaces. Mirrors the server's `IWorkspace` /
 * `IWorkspaceMember` / `IWorkspaceInvitation` shapes and the workspace
 * controller responses exactly (see
 * `server/src/interfaces/core/IWorkspace*.ts` and
 * `server/src/v7/controllers/workspaces/`).
 *
 * `capabilities` is a CLOSED, Sublay-enforced vocabulary (cascades via reach);
 * `permissions` is opaque free-form developer strings Sublay never consumes
 * (per-node only, does NOT cascade).
 */

export type WorkspaceCapability =
  | "view"
  | "invite"
  | "remove-member"
  | "edit-member-access"
  | "edit-member-profile"
  | "create-sub-workspace"
  | "edit-workspace";

export type WorkspaceInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";

// A user's relation to a workspace, as resolved by the authority resolver. A
// user may carry several at once.
export type WorkspaceAuthorityReason =
  | "owner"
  | "ancestor-owner"
  | "member"
  | "reach-holder";

// One structured standing entry, as returned by the per-user standing read and
// the authority read. `viaWorkspaceId` names the ancestor responsible and is
// present on `ancestor-owner` / `reach-holder` only (`owner` / `member` are
// grants on the target workspace itself). A user may carry SEVERAL entries of
// the same type — one per granting ancestor.
//
// Modelled as a discriminated union so `type` narrows `viaWorkspaceId`: the two
// ancestor-derived reasons ALWAYS carry it and the two target-local reasons
// NEVER do — those are the only four combinations the server emits (see
// `resolveWorkspaceAuthority`).
export type WorkspaceAuthorityReasonDetail =
  | {
      // A grant on the target workspace itself — no ancestor is responsible.
      type: "owner" | "member";
      viaWorkspaceId?: never;
    }
  | {
      // A grant derived from an ancestor, which `viaWorkspaceId` names.
      type: "ancestor-owner" | "reach-holder";
      viaWorkspaceId: string;
    };

export interface Workspace {
  id: string;
  name: string;
  metadata: Record<string, any>;
  ownerId: string;
  parentWorkspaceId: string | null;
  // Denormalized depth (0 for a root workspace, parent.depth + 1 for a child).
  depth: number;
  // Whether capabilities held on an ancestor "reach" into this node. Off by
  // default (strict). Owner-only to flip.
  inheritsFromParent: boolean;
  createdAt: string;
  updatedAt: string;
  // Present only when `include=memberCount` is requested on a single-workspace
  // read — the workspace's DIRECT member count.
  memberCount?: number;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  capabilities: string[];
  permissions: string[];
  rank: number;
  title: string | null;
  metadata: Record<string, any>;
  joinedAt: string;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  invitedBy: string;
  userId: string | null;
  email: string | null;
  capabilities: string[];
  permissions: string[];
  rank: number;
  title: string | null;
  status: WorkspaceInvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// One entry in the unified roster read. One entry per distinct user, carrying a
// `reasons` array (a user may appear via several relations at once).
export interface WorkspaceRosterReason {
  type:
    | "owner"
    | "member"
    | "ancestor-owner"
    | "reach-holder"
    | "descendant-member";
  // `member` carries `rank`/`capabilities`/`permissions`/`title`/`metadata`;
  // `ancestor-owner`/`reach-holder` carry `viaWorkspaceId` (reach-holder also
  // `capabilities`); `descendant-member` carries `workspaceId` + `rank`/
  // `capabilities`. `owner` carries none.
  //
  // The authority-bearing fields (`rank`, `capabilities`, `permissions`) are
  // additionally OMITTED (absent, not null) on OTHER users' entries unless the
  // caller operates people on the workspace (holds `invite`, `remove-member`,
  // `edit-member-access` or `edit-member-profile`) or is an owner/ancestor-owner.
  // The caller's OWN entry always carries them.
  rank?: number;
  capabilities?: string[];
  permissions?: string[];
  title?: string | null;
  metadata?: Record<string, any>;
  viaWorkspaceId?: string;
  workspaceId?: string;
}

export interface WorkspaceRosterEntry {
  user: User;
  reasons: WorkspaceRosterReason[];
}

export interface WorkspaceRosterResponse {
  data: WorkspaceRosterEntry[];
  total: number;
}

export interface WorkspaceRosterCountsResponse {
  counts: {
    owner: number;
    member: number;
    ancestorOwner: number;
    reachHolder: number;
    descendantMember: number;
  };
  // Distinct-user seat number (NOT the sum of buckets, which overlap).
  total: number;
  // Distinct users across every included bucket (informational).
  distinctUsers: number;
}

// The per-user standing read (`GET /workspaces/:id/members/:userId`).
/**
 * The `user` carried by a standing read. Normally the full user record, but the
 * server falls back to `{ id }` alone when the user row is gone (a deleted user
 * with a lingering membership row is a reachable case), so every field except
 * `id` may be absent.
 */
export type WorkspaceStandingUser = Pick<User, "id"> &
  Partial<Omit<User, "id">>;

export interface WorkspaceMemberStanding {
  user: WorkspaceStandingUser;
  reasons: WorkspaceAuthorityReasonDetail[];
  // The authority-bearing fields are OMITTED (absent, not null) unless the
  // caller operates people on the workspace (holds `invite`, `remove-member`,
  // `edit-member-access` or `edit-member-profile`), is an owner/ancestor-owner,
  // or is asking about THEMSELVES — a caller always sees their own access.
  capabilities?: string[];
  permissions?: string[];
  rank?: number | null;
  title: string | null;
  metadata: Record<string, any>;
}

// The authority-as-a-service read (`GET /workspaces/:id/authority/me`).
export interface WorkspaceAuthority {
  reasons: WorkspaceAuthorityReasonDetail[];
  capabilities: string[];
  permissions: string[];
  rank: number | null;
}

/**
 * One descendant the subtree sweep did NOT clear, where the target user still
 * holds a direct membership.
 *
 * `id` / `name` are masked TOGETHER: an entry the acting user may see carries
 * both, and one they may not carries `null` for both — the sweep reports THAT a
 * membership survived without disclosing the existence or name of a sealed
 * sub-workspace the actor has no authority over (the same sealing fence the
 * descendant roster read applies). Modelled as a discriminated union so a
 * `null` check on `id` narrows `name` too.
 */
export type SkippedWorkspace =
  | {
      // Visible: the actor has standing on this workspace.
      id: string;
      name: string;
      /** Why it was skipped. `out-of-reach`: the actor's authority does not extend there. */
      reason: "out-of-reach";
    }
  | {
      // Sealed: the actor has no standing there, so its identity is withheld.
      id: null;
      name: null;
      /** Why it was skipped. `out-of-reach`: the actor's authority does not extend there. */
      reason: "out-of-reach";
    };

// Subtree-offboarding response (`POST /members/:userId/remove-from-subtree`).
export interface RemoveWorkspaceMemberFromSubtreeResponse {
  removedCount: number;
  removed: { workspaceId: string; userId: string }[];
  /**
   * How many descendant memberships the target RETAINED because the sweep could
   * not reach them. Always `0` for an owner / ancestor-owner / privileged key.
   * A non-zero value means the offboarding is PARTIAL — never conclude a user is
   * fully removed from `removedCount` alone.
   */
  skippedCount: number;
  /** One entry per retained membership; `skippedCount === skipped.length`. */
  skipped: SkippedWorkspace[];
}
