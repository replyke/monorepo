import { GrantSummary } from "./ReputationGrant";
import { Entity } from "./Entity";
import { Mention } from "./Mention";
import { User } from "./User";
import { ReactionCounts, ReactionType } from "./Reaction";

export interface GifData {
  id: string;
  url: string;
  gifUrl: string;
  gifPreviewUrl: string;
  // Server gifSchema requires both as strings (altText required, aspectRatio a string).
  altText: string;
  aspectRatio: string;
}

export interface Comment {
  id: string;
  projectId: string;
  foreignId: string | null;
  entityId: string;
  entity?: Entity; // Populated when include contains "entity" or "space"
  userId: string;
  user?: User; // Populated when include contains "user"
  parentId: string | null;
  parentComment?: Comment; // Populated when include contains "parent"
  content: string | null;
  gif: GifData | null;
  mentions: Mention[];
  upvotes: string[];   // Legacy v6 — v7 uses reactionCounts
  downvotes: string[]; // Legacy v6 — v7 uses reactionCounts
  reactionCounts: ReactionCounts;
  userReaction?: ReactionType | null; // Present when authenticated
  repliesCount: number;
  /**
   * Reputation-grant summary. Opt-in — present exactly when the read requested
   * `include=grants`. Once requested the server always returns the object,
   * zero-filled rather than omitted, on projects with no grants and on projects
   * without the reputation bundle alike.
   */
  grants?: GrantSummary;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parentDeletedAt: string | null; // Legacy v6
  userDeletedAt: string | null;   // v7 user-initiated deletion (Reddit-style placeholder)
  moderationStatus: "approved" | "removed" | null;
  moderatedAt: string | null;
  moderatedById: string | null;
  moderatedByType: "client" | "user" | null;
  moderationReason: string | null;
}
