import { PaginatedResponse, PaginationMetadata } from "../PaginatedResponse";
import { File } from "./File";

export type ReadingPermission = "anyone" | "members";
export type PostingPermission = "anyone" | "members" | "admins";
export type SpaceVisibility = "public" | "unlisted" | "private";

export type SpaceMemberRole = "admin" | "moderator" | "member";
export type SpaceMemberStatus = "pending" | "active" | "banned" | "rejected";

export interface SpaceMemberPermissions {
  isAdmin: boolean;
  isModerator: boolean;
  isMember: boolean;
  status: "pending" | "active" | "banned" | null;
  canPost: boolean;
  canModerate: boolean;
  canRead: boolean;
}
export type PaginationMeta = PaginationMetadata;

export interface SpacePreview {
  id: string;
  shortId: string;
  name: string;
  slug: string | null;
  avatarFileId: string | null;
  readingPermission?: ReadingPermission;
  visibility?: SpaceVisibility;
  parentSpaceId?: string | null;
  depth?: number;

  // File associations (populated via joins)
  avatarFile?: File;
}

export interface Space {
  // Core identifiers
  id: string;
  projectId: string;
  shortId: string;
  slug: string | null;

  // Display info
  name: string;
  description: string | null;
  avatarFileId: string | null;
  bannerFileId: string | null;

  // Ownership & permissions
  userId: string;
  readingPermission: ReadingPermission;
  postingPermission: PostingPermission;
  visibility: SpaceVisibility;
  requireJoinApproval: boolean;

  // NSFW
  nsfw: boolean; // The space's own NSFW flag
  nsfwEffective: boolean; // Denormalized: own nsfw OR any ancestor space's nsfw

  // Hierarchy
  parentSpaceId: string | null;
  depth: number;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Computed fields
  membersCount: number;
  childSpacesCount: number;
  isMember?: boolean; // Optional: only present when user is authenticated

  // File associations (populated via joins)
  avatarFile?: File;
  bannerFile?: File;
}

// Extended space with detailed information (returned from single space fetch endpoints)
export interface SpaceDetailed extends Space {
  // Current user's membership permissions in this space (always included when fetching single space)
  memberPermissions: SpaceMemberPermissions | null;

  // Parent space information (always included, null if root space)
  parentSpace: SpacePreview | null;

  // Child spaces preview (always included, empty array if no children)
  childSpaces: SpacePreview[];
}

// My Spaces response types
export interface UserSpaceItem {
  space: Space;
  membership: {
    membershipId: string;
    role: SpaceMemberRole;
    status: SpaceMemberStatus;
    joinedAt: string;
  };
}

export type UserSpacesResponse = PaginatedResponse<UserSpaceItem>;

// Mutation response types
export interface JoinSpaceResponse {
  message: string;
  membership: {
    id: string;
    spaceId: string;
    userId: string;
    role: "member";
    status: "pending" | "active";
    joinedAt: string;
  };
}

export interface LeaveSpaceResponse {
  message: string;
}

export interface UpdateMemberRoleResponse {
  message: string;
  membership: {
    id: string;
    role: SpaceMemberRole;
    status: string;
    joinedAt: string;
    userId: string;
  };
}

export interface ApproveMemberResponse {
  message: string;
  membership: {
    id: string;
    status: "active";
    joinedAt: string;
  };
}

export interface DeclineMemberResponse {
  message: string;
  membership: {
    id: string;
    status: "rejected";
  };
}

export interface BanMemberResponse {
  message: string;
  membership: {
    id: string;
    status: "banned";
  };
}

export interface UnbanMemberResponse {
  message: string;
  membership: {
    id: string;
    status: "active";
  };
}

export interface CheckMyMembershipResponse {
  isMember: boolean;
  role: "admin" | "moderator" | "member" | null;
  status: "pending" | "active" | "banned" | "rejected" | null;
  joinedAt: string | null;
  permissions: {
    canPost: boolean;
    canModerate: boolean;
    canRead: boolean;
    isAdmin: boolean;
    isModerator: boolean;
  };
}

// The server replies with `{ message }` only — it does not echo the deleted
// space or any per-table counts.
export interface DeleteSpaceResponse {
  message: string;
}

// Space include types (following Entity/User pattern)
export type SpaceInclude = "files";
export type SpaceIncludeArray = SpaceInclude[];
export type SpaceIncludeParam = SpaceInclude | SpaceIncludeArray;
