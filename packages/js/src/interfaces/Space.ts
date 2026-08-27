import { PaginatedResponse } from "./IPaginatedResponse";
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
  avatarFile?: File;
}

export interface Space {
  id: string;
  projectId: string;
  shortId: string;
  slug: string | null;
  name: string;
  description: string | null;
  avatarFileId: string | null;
  bannerFileId: string | null;
  userId: string;
  readingPermission: ReadingPermission;
  postingPermission: PostingPermission;
  visibility: SpaceVisibility;
  requireJoinApproval: boolean;
  nsfw: boolean; // The space's own NSFW flag
  nsfwEffective: boolean; // Denormalized: own nsfw OR any ancestor space's nsfw
  parentSpaceId: string | null;
  depth: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  membersCount: number;
  childSpacesCount: number;
  isMember?: boolean; // Only present when user is authenticated
  avatarFile?: File;
  bannerFile?: File;
}

// Returned from single-space fetch endpoints — extends Space with extra context
export interface SpaceDetailed extends Space {
  memberPermissions: SpaceMemberPermissions | null;
  parentSpace: SpacePreview | null;
  childSpaces: SpacePreview[];
}

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

export interface SpaceBreadcrumb {
  breadcrumb: SpacePreview[];
  depth: number;
}
