import { GifData } from "./Comment";
import { File } from "./File";
import { Mention } from "./Mention";
import { GrantSummary } from "./ReputationGrant";
import { User } from "./User";

export interface ChatMessage {
  id: string;
  // Locally-generated UUID echoed by the server in the REST response and socket payload.
  // Never stored in the DB. Used for optimistic deduplication (matching temp entries to confirmed ones).
  localId?: string;
  projectId: string;
  conversationId: string;
  // null when the original sender's account has been deleted (FK SET NULL)
  userId: string | null;
  content: string | null;
  gif: GifData | null;
  mentions: Mention[];
  // Opt-in only — populated when the hook is called with includeFiles: true.
  // Omitted by default to keep message payloads small in large conversations.
  files?: File[];
  metadata: Record<string, any>;
  parentMessageId: string | null;
  quotedMessageId: string | null;
  threadReplyCount: number;
  // emoji → count (computed server-side, not a DB column)
  reactionCounts: Record<string, number>;
  // emojis the requesting user has reacted with on this message (computed server-side)
  userReactions: string[];
  // Reputation-grant summary. Opt-in — present exactly when the read asked for
  // it (`includeGrants: true` on the message hooks), and kept live afterwards
  // by the `message:grant` socket event.
  //
  // Optional ONLY along that opt-in axis: once requested, the server always
  // returns the object — zero-filled (`{ total: 0, count: 0, viewerTotal: 0 }`)
  // rather than omitted — on projects with no grants and on projects without
  // the reputation bundle alike. So `grants` being undefined means "nobody
  // asked", never "this project has no grants".
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
  // null when userId is null (account deleted) — same pattern as Comment model
  user: User | null;
  // Populated one level deep only. Chains are resolved from the Redux store at render time
  // (via quotedMessageId) so that edits to quoted messages propagate automatically.
  quotedMessage?: ChatMessage | null;
  parentMessage?: ChatMessage | null;

  // Client-only flag — never comes from the server.
  // Set to true by failOptimisticMessage when a send request fails.
  sendFailed?: boolean;
}
