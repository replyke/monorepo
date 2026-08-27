import type { ChatMessage } from "../interfaces/models/ChatMessage";
import type { ReputationGrant } from "../interfaces/models/ReputationGrant";
import type {
  Conversation,
  ConversationPreview,
} from "../interfaces/models/Conversation";
import type { ConversationMember } from "../interfaces/models/ConversationMember";

// ─── Server → Client events ────────────────────────────────────────────────

// This is a hand-maintained mirror of the server's own copy (server
// src/types/socket.ts) — nothing typechecks the two against each other, so a
// field declared here that the server never sends compiles cleanly and fails
// silently at runtime. Message-scoped events all carry `conversationId`;
// handlers tolerate its absence so an SDK ahead of its server still works.
export interface ServerToClientEvents {
  "message:created": (message: ChatMessage) => void;
  "message:updated": (payload: {
    messageId: string;
    conversationId: string;
    content: string | null;
    gif: ChatMessage["gif"];
    mentions: ChatMessage["mentions"];
    metadata: Record<string, any>;
    editedAt: string | null;
  }) => void;
  "message:deleted": (payload: {
    messageId: string;
    conversationId: string;
    userDeletedAt: string;
  }) => void;
  "message:removed": (payload: {
    messageId: string;
    conversationId: string;
  }) => void;
  "message:reaction": (payload: {
    messageId: string;
    conversationId: string;
    emoji: string;
    userId: string;
    delta: 1 | -1;
    reactionCounts: Record<string, number>;
  }) => void;
  // A reputation grant landed on a message in this conversation. `grant` is the
  // full created row (its `senderId` is null for an app mint); `summary` is the
  // message's recomputed positive-grant totals.
  //
  // `summary` carries NO `viewerTotal`, unlike the HTTP read surfaces: this is a
  // room broadcast and that figure is per-viewer, so one number would be wrong
  // for every recipient but one. Clients derive their own from `grant.senderId`
  // + `grant.amount`, exactly as they do from `message:reaction`'s `delta`.
  "message:grant": (payload: {
    messageId: string;
    conversationId: string;
    grant: ReputationGrant;
    summary: { total: number; count: number };
  }) => void;
  "thread:reply_count": (payload: {
    messageId: string;
    conversationId: string;
    threadReplyCount: number;
  }) => void;
  "typing:start": (payload: {
    userId: string;
    conversationId: string;
  }) => void;
  "typing:stop": (payload: {
    userId: string;
    conversationId: string;
  }) => void;
  "member:joined": (payload: {
    conversationId: string;
    member: ConversationMember;
  }) => void;
  "member:left": (payload: {
    conversationId: string;
    userId: string;
  }) => void;
  "conversation:updated": (patch: Partial<Conversation> & { id: string }) => void;
  "conversation:deleted": (payload: { conversationId: string }) => void;
  // Fired to a recipient when they're added to a brand-new conversation (DM
  // target, group initial members, newly added group member). Carries that
  // recipient's full ConversationPreview so the inbox inserts the row live.
  "conversation:created": (preview: ConversationPreview) => void;
}

// ─── Client → Server events ────────────────────────────────────────────────

export interface ClientToServerEvents {
  "join:conversation": (payload: { conversationId: string }) => void;
  "leave:conversation": (payload: { conversationId: string }) => void;
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
}
