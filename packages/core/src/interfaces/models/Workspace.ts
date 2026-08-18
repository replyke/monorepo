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
  rank?: number;
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
  reasons: WorkspaceAuthorityReason[];
  capabilities: WorkspaceCapability[];
  permissions: string[];
  rank: number | null;
  title: string | null;
  metadata: Record<string, any>;
}

// The authority-as-a-service read (`GET /workspaces/:id/authority/me`).
export interface WorkspaceAuthority {
  reasons: WorkspaceAuthorityReason[];
  capabilities: WorkspaceCapability[];
  permissions: string[];
  rank: number | null;
}
