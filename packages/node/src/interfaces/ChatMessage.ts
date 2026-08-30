import { GrantSummary } from "./ReputationGrant";
import { GifData } from "./Comment";
import { File } from "./File";
import { Mention } from "./Mention";
import { User } from "./User";

export interface ChatMessage {
  id: string;
  projectId: string;
  conversationId: string;
  userId: string | null; // null when the sender's account has been deleted
  content: string | null;
  gif: GifData | null;
  mentions: Mention[];
  files?: File[]; // Opt-in only — omitted by default
  metadata: Record<string, any>;
  parentMessageId: string | null;
  quotedMessageId: string | null;
  threadReplyCount: number;
  reactionCounts: Record<string, number>; // emoji → count
  userReactions: string[];               // emojis the requesting user reacted with
  /**
   * Reputation-grant summary. Opt-in — present exactly when the read requested
   * `include=grants`. Once requested the server always returns the object,
   * zero-filled rather than omitted, on projects with no grants and on projects
   * without the reputation bundle alike.
   */
  grants?: GrantSummary;
  editedAt: string | null;
  userDeletedAt: string | null;
  moderationStatus: "approved" | "removed" | null;
  moderatedAt: string | null;
  moderatedById: string | null;
  moderatedByType: "client" | "user" | null;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Populated fields
  user: User | null;
  quotedMessage?: ChatMessage | null;
  parentMessage?: ChatMessage | null;
}
