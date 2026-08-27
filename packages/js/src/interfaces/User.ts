import { File } from "./File";

export type UserRole = "admin" | "moderator" | "visitor";

export type UserFull = {
  id: string;
  projectId: string;
  foreignId: string | null;
  role: UserRole;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
  avatarFileId: string | null;
  bannerFileId: string | null;
  avatarFile?: File | null;
  bannerFile?: File | null;
  bio: string | null; // Max 300 characters
  birthdate: string | null;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  metadata: Record<string, any>;
  secureMetadata: Record<string, any>; // Excluded from public responses
  reputation: number;
  /**
   * Space-scoped reputation, present only when the request opted in via
   * `spaceReputationId` (and the project has the reputation bundle). It is the
   * user's reputation within the requested space context — see
   * {@link SpaceReputationContextParams} / {@link SpaceReputationUserParams}.
   */
  spaceReputation?: number;
  isVerified: boolean;
  isActive: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
};

// Returned to the authenticated user about themselves
export type AuthUser = Omit<UserFull, "secureMetadata"> & {
  suspensions: {
    reason: string | null;
    startDate: string;
    endDate: string | null;
  }[];
  authMethods: string[]; // e.g. ["password", "google", "github"]
};

// Returned in public contexts (e.g. nested on entities/comments)
export type User = Omit<
  UserFull,
  | "email"
  | "secureMetadata"
  | "isVerified"
  | "isActive"
  | "lastActive"
  | "updatedAt"
>;
