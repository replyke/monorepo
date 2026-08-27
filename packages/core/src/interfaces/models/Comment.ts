import { Entity } from "./Entity";
import { Mention } from "./Mention";
import { User } from "./User";
import { ReactionCounts, ReactionType } from "./Reaction";
import { GrantSummary } from "./ReputationGrant";

export interface GifData {
  id: string;
  url: string;
  gifUrl: string;
  gifPreviewUrl: string;
  // The server's gif schema requires both as strings (aspectRatio is a string,
  // e.g. "1.5", not a number).
  altText: string;
  aspectRatio: string;
}

export interface Comment {
  id: string; // Sequelize auto-generates this
  projectId: string; // Required
  foreignId: string | null;
  entityId: string; // Required
  entity?: Entity; // Optional - included when include contains "entity" or "space"
  userId: string;
  user?: User; // Optional - included when include contains "user"
  parentId: string | null; // Optional parent comment (if it's a reply)
  parentComment?: Comment; // Optional - included when include contains "parent"
  content: string | null; // Required
  gif: GifData | null;
  mentions: Mention[];
  upvotes: string[]; // Array of user IDs (v6 legacy - v7 uses reactionCounts)
  downvotes: string[]; // Array of user IDs (v6 legacy - v7 uses reactionCounts)
  reactionCounts: ReactionCounts; // v7 reaction system - counts for all 8 reaction types
  userReaction?: ReactionType | null; // v7 - current user's reaction (populated when authenticated)
  repliesCount: number; // Count of replies
  grants?: GrantSummary; // Optional - reputation-grant summary, populated when include contains "grants". Zero-filled (never omitted) on projects without the grants table.
  metadata: Record<string, any>; // JSON object that could contain any other data about the comment which is relevant. Limited to 10KB size.
  createdAt: string; // Timestamp for creation
  updatedAt: string; // Timestamp for updating
  deletedAt: string | null; // Timestamp for updating
  // Legacy v6 field: set on children when their parent was paranoid-deleted.
  // Not used by v7 (which uses userDeletedAt). Can be removed once v6 is
  // retired and legacy data is cleaned up.
  parentDeletedAt: string | null;
  userDeletedAt: string | null; // Timestamp for user-initiated deletion (Reddit-style placeholder)
  moderationStatus: "approved" | "removed" | null;
  moderatedAt: string | null;
  moderatedById: string | null;
  moderatedByType: "client" | "user" | null;
  moderationReason: string | null;
}

export type CommentInclude =
  | "user"
  | "entity"
  | "space"
  | "parent"
  | "grants";
export type CommentIncludeArray = CommentInclude[];
export type CommentIncludeParam = CommentInclude | CommentIncludeArray;
