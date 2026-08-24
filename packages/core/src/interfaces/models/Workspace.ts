import { User } from "./User";

/**
 * Workspaces bundle interfaces (client subset). Mirrors the server's
 * `IWorkspace` / `IWorkspaceMember` / `IWorkspaceInvitation` shapes and the
 * workspace controller responses.
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

export type WorkspaceInclude = "memberCount";
export type WorkspaceIncludeArray = WorkspaceInclude[];
export type WorkspaceIncludeParam = string | WorkspaceIncludeArray;

export interface Workspace {
  id: string;
  name: string;
  metadata: Record<string, any>;
  ownerId: string;
  parentWorkspaceId: string | null;
  depth: number;
  inheritsFromParent: boolean;
  createdAt: string;
  updatedAt: string;
  // Present only when `include=memberCount` is requested on a single read.
  memberCount?: number;
}

// A direct membership row on one workspace node.
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  capabilities: WorkspaceCapability[];
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
  capabilities: WorkspaceCapability[];
  permissions: string[];
  rank: number;
  title: string | null;
  status: WorkspaceInvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// One entry in the unified roster read — one entry per distinct user, carrying a
// `reasons` array.
export interface WorkspaceRosterReason {
  type:
    | "owner"
    | "member"
    | "ancestor-owner"
    | "reach-holder"
    | "descendant-member";
  // `member` carries `rank`/`relativeRank`/`capabilities`/`permissions`/
  // `title`/`metadata`; `ancestor-owner`/`reach-holder` carry `viaWorkspaceId`
  // (reach-holder also `capabilities`); `descendant-member` carries
  // `workspaceId` + `rank`/`capabilities` but never `relativeRank`. `owner`
  // carries none.
  //
  // The authority-bearing fields (`rank`, `relativeRank`, `capabilities`,
  // `permissions`) are additionally OMITTED (absent, not null) on OTHER users'
  // entries unless the caller operates people on the workspace (holds `invite`,
  // `remove-member`, `edit-member-access` or `edit-member-profile`) or is an
  // owner/ancestor-owner. The caller's OWN entry always carries them.
  rank?: number;
  /**
   * The SAME ladder position, expressed as an offset from the CALLER: `1` = one
   * rung below you, `0` = your peer, `-3` = three rungs above you. The caller's
   * own anchor is their member row on this workspace if they hold one, and apex
   * (one step above rank 0) if they do not — so a rank-0 member reads back as
   * `relativeRank: 1` for an owner.
   *
   * Authority-bearing and fenced WITH `rank`, never beside it: it is `rank`
   * minus a number the caller already knows, so leaking it leaks `rank` exactly.
   *
   * Present on same-node `member` reasons only. `descendant-member` entries
   * carry `rank` but NEVER `relativeRank` — rank is per-workspace, so an offset
   * measured against your standing on THIS node would be arithmetic across two
   * different ladders. Use their absolute `rank` there.
   */
  relativeRank?: number;
  capabilities?: WorkspaceCapability[];
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
  total: number;
  distinctUsers: number;
}

// The per-user standing read (`GET /workspaces/:id/members/:userId`) — the
// target user plus their resolved authority and their direct-row cosmetics.
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
  capabilities?: WorkspaceCapability[];
  permissions?: string[];
  rank?: number | null;
  /**
   * `rank` expressed as an offset from the CALLER (negative = senior to you).
   * `null` exactly when `rank` is `null` — a target with no direct member row
   * here sits outside the ladder and has no position to measure. Fenced with
   * `rank`: absent (not null) for a caller who may not see it.
   */
  relativeRank?: number | null;
  title: string | null;
  metadata: Record<string, any>;
}

// The authority-as-a-service read (`GET /workspaces/:id/authority/me`).
export interface WorkspaceAuthority {
  reasons: WorkspaceAuthorityReasonDetail[];
  capabilities: WorkspaceCapability[];
  permissions: string[];
  rank: number | null;
  /**
   * `rank` as an offset from the caller — structurally degenerate on this
   * endpoint, because the caller IS the subject: `0` when you hold a member row
   * on this workspace, `null` when you do not. Returned anyway so all three
   * workspace reads carry both coordinates and a client never has to
   * special-case which one it is reading. Never fenced here — this read is
   * inherently about yourself, so there is no one else's `rank` to reconstruct.
   */
  relativeRank: number | null;
}
