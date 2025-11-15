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
  bio: string | null; // limited to 300 characters
  birthdate: Date | null;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  } | null; // Optional location stored as GeoJSON
  metadata: Record<string, any>; // JSON object that could contain any other data about the user which is relevant to the project. Limited to 10KB size.
  secureMetadata: Record<string, any>; // Same as metadata only it is excluded when user is added to entity and comment data
  reputation: number; // Automatically managed by replyke based on usr activity
  isVerified: boolean; // Whether the user is verified
  isActive: boolean; // Whether the user account is active
  lastActive: Date; // Timestamp for last activity
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

// These are the details the get delivered to the authenticated user's client (about themselves)
export type AuthUser = Pick<
  UserFull,
  | "id"
  | "projectId"
  | "foreignId"
  | "role"
  | "email"
  | "name"
  | "username"
  | "avatar"
  | "bio"
  | "birthdate"
  | "metadata"
  | "reputation"
  | "isVerified"
  | "isActive"
  | "lastActive"
> & {
  suspensions: {
    reason: string | null;
    startDate: Date;
    endDate: Date | null;
  }[];
};

// This is used in some places where we need to return a user object to the client, either of themselves or of someone else.
export type User = Omit<
  UserFull,
  | "email"
  | "secureMetadata"
  | "isVerified"
  | "isActive"
  | "lastActive"
  | "updatedAt"
  | "deletedAt"
>;
