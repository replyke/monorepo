import { User } from "./User";

// 8 reaction types with specific reputation impacts
export type ReactionType =
  | "upvote"   // +1 reputation
  | "downvote" // -1 reputation
  | "like"     // +1 reputation
  | "love"     // +2 reputation
  | "wow"      // +1 reputation
  | "sad"      // 0 reputation
  | "angry"    // 0 reputation
  | "funny";   // +1 reputation

// Reaction counts stored as JSONB on Entity/Comment
export interface ReactionCounts {
  upvote: number;
  downvote: number;
  like: number;
  love: number;
  wow: number;
  sad: number;
  angry: number;
  funny: number;
}

// Individual Reaction record from the Reactions table
export interface Reaction {
  id: string;
  projectId: string;
  targetType: "entity" | "comment";
  targetId: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
  updatedAt: string;
  user?: User;
}
