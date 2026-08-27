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
  // Reputation-grant summary. Opt-in on the READ — the server populates it
  // exactly when the hook is called with `includeGrants: true`, and once
  // requested it always returns the object, zero-filled
  // (`{ total: 0, count: 0, viewerTotal: 0 }`) rather than omitted, on projects
  // with no grants and on projects without the reputation bundle alike. So a
  // present-but-zero summary never means "this project has no grants".
  //
  // Presence is NOT a record of what the read asked for, though: `chatSlice`'s
  // `updateGrants` writes this field on every loaded copy of the message when a
  // `message:grant` socket event arrives, whether or not the fetch that loaded
  // it opted in. A message read without `includeGrants` therefore GAINS the
  // field the moment someone grants on it while the conversation is open.
  //
  // That is deliberate, and preserving the opt-in state instead would be worse:
  // the reducer cannot tell an opted-out message from one that simply has no
  // grants yet, so honouring the axis would mean dropping live grants on the
  // floor for the exact conversations that are watching for them.
  //
  // What `undefined` reliably means is therefore "nobody asked AND no grant has
  // landed since" — treat it as "unknown", not as "zero".
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
