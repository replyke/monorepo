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
  // `member` carries `rank`/`capabilities`; `ancestor-owner`/`reach-holder`
  // carry `viaWorkspaceId` (reach-holder also `capabilities`);
  // `descendant-member` carries `workspaceId`. `owner` carries none.
  rank?: number;
  capabilities?: string[];
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
export interface WorkspaceMemberStanding {
  user: User;
  reasons: WorkspaceAuthorityReason[];
  capabilities: string[];
  permissions: string[];
  rank: number | null;
  title: string | null;
  metadata: Record<string, any>;
}

// The authority-as-a-service read (`GET /workspaces/:id/authority/me`).
export interface WorkspaceAuthority {
  reasons: WorkspaceAuthorityReason[];
  capabilities: string[];
  permissions: string[];
  rank: number | null;
}

// Subtree-offboarding response (`POST /members/:userId/remove-from-subtree`).
export interface RemoveFromSubtreeResponse {
  removedCount: number;
  removed: { workspaceId: string; userId: string }[];
}
