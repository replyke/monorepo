import { Mention } from "./Mention";
import { User } from "./User";
import { Space } from "./Space";
import { ReactionCounts, ReactionType } from "./Reaction";
import { File } from "./File";

export interface TopComment {
  id: string;
  user: User;
  upvotesCount: number;
  content: string;
  createdAt: string;
}

export interface Entity {
  id: string;
  foreignId: string | null;
  shortId: string;
  projectId: string;
  sourceId: string | null;
  spaceId: string | null;
  space?: Space | null; // Populated when include contains "space"
  userId: string | null;
  user?: User | null;
  title: string | null;
  content: string | null;
  mentions: Mention[];
  attachments: Record<string, any>[];
  files?: File[]; // Populated when include contains "files"
  keywords: string[];
  upvotes: string[];   // Legacy v6 — v7 uses reactionCounts
  downvotes: string[]; // Legacy v6 — v7 uses reactionCounts
  reactionCounts: ReactionCounts;
  userReaction?: ReactionType | null; // Present when authenticated
  repliesCount: number;
  views: number;
  score: number;
  scoreUpdatedAt: Date;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  metadata: Record<string, any>;
  topComment: TopComment | null;
  isSaved?: boolean; // Populated when include contains "saved"
  isDraft: boolean | null;
  moderationStatus: "approved" | "removed" | null;
  moderatedAt: Date | null;
  moderatedById: string | null;
  moderatedByType: "client" | "user" | null;
  moderationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
