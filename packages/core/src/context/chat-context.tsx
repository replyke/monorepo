import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useSublayDispatch, useSublaySelector } from "../store/hooks";
import { selectAccessToken } from "../store/slices/authSlice";
import { selectUser } from "../store/slices/userSlice";
import { selectUser as selectAuthUser } from "../store/slices/authSlice";
import useProject from "../hooks/projects/useProject";
import { BASE_URL } from "../config/axios";
import type { ServerToClientEvents, ClientToServerEvents } from "../types/socket";
import {
  upsertMessage,
  upsertConversationPreview,
  insertConversationPreview,
  removeConversationPreview,
  incrementUnread,
  setSocketConnected,
  setTypingUsers,
  updateReactions,
  updateGrants,
  setConversation,
  setUnreadSummary,
  selectConversationList,
} from "../store/slices/chatSlice";
import useAxiosPrivate from "../config/useAxiosPrivate";
import useFetchConversationPreview from "../hooks/chat/conversations/useFetchConversationPreview";
import type { ChatMessage } from "../interfaces/models/ChatMessage";
import type {
  Conversation,
  ConversationPreview,
} from "../interfaces/models/Conversation";

// ─── Context shape ────────────────────────────────────────────────────────────

export interface ChatContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  /** Called by ConversationProvider on mount to suppress unread increments */
  registerActiveConversation: (id: string) => void;
  /** Called by ConversationProvider on unmount */
  unregisterActiveConversation: (id: string) => void;
}

export const ChatContext = createContext<ChatContextValue>({
  socket: null,
  connected: false,
  registerActiveConversation: () => {},
  unregisterActiveConversation: () => {},
});

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useChatContext(): ChatContextValue {
  return useContext(ChatContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface ChatProviderProps {
  children: ReactNode;
}

/** Derive the socket.io server URL from the REST API base URL. */
function getSocketUrl(): string {
  // socket.io mounts at the origin; strip the path from BASE_URL
  try {
    return new URL(BASE_URL).origin;
  } catch {
    return "https://api.sublay.io";
  }
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();
  const axiosPrivate = useAxiosPrivate();

  const accessToken = useSublaySelector(selectAccessToken);
  const user = useSublaySelector(selectUser);
  const authUser = useSublaySelector(selectAuthUser);
  const currentUser = user || authUser;

  // Keep mutable refs for values the socket handlers need without closing over stale state
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser]);

  // Fresh snapshot of messages for socket handlers that need to find a message by id
  const messagesRef = useRef<Record<string, { items: ChatMessage[] }>>({});
  const allMessages = useSublaySelector((state: any) => state.sublay.chat.messages as Record<string, { items: ChatMessage[] }>);
  useEffect(() => {
    messagesRef.current = allMessages;
  }, [allMessages]);

  // Fresh snapshot of conversations for conversation:updated merging
  const conversationsRef = useRef<Record<string, { data: Conversation | null }>>({});
  const allConversations = useSublaySelector((state: any) => state.sublay.chat.conversations as Record<string, { data: Conversation | null }>);
  useEffect(() => {
    conversationsRef.current = allConversations;
  }, [allConversations]);

  // Fresh snapshot of the loaded inbox list — socket handlers consult this to
  // decide whether a conversation is already represented (loaded) or needs a
  // fetch-and-insert.
  const conversationListRef = useRef<ConversationPreview[]>([]);
  const conversationList = useSublaySelector(selectConversationList);
  useEffect(() => {
    conversationListRef.current = conversationList;
  }, [conversationList]);

  // Single-preview fetcher, kept in a ref so the socket effect (which binds its
  // handlers once) always calls the latest closure without re-subscribing.
  const fetchConversationPreview = useFetchConversationPreview();
  const fetchPreviewRef = useRef(fetchConversationPreview);
  useEffect(() => {
    fetchPreviewRef.current = fetchConversationPreview;
  }, [fetchConversationPreview]);

  // Socket state (tracked in React state so context consumers re-render when it changes)
  const [socketState, setSocketState] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);

  // Mutable refs that don't need to trigger re-renders
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const prevTokenRef = useRef<string | null>(null);

  // Set of conversationIds currently open — prevents unread bumps for active views
  const activeConversationIds = useRef<Set<string>>(new Set());

  // Typing timers per conversation: conversationId → Map<userId, timer>
  const typingTimers = useRef<Map<string, Map<string, ReturnType<typeof setTimeout>>>>(new Map());

  // conversationIds with a single-preview fetch in flight — dedupes bursts of
  // events for the same not-loaded conversation into a single network call.
  const inFlightPreviews = useRef<Set<string>>(new Set());

  // Debounce timer for the authoritative unread-summary refetch (the only
  // correct source of truth for not-loaded global counters).
  const unreadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks whether the socket has connected at least once, so the unread
  // summary is refetched only on *re*connect (mount already fetches it).
  const hasConnectedRef = useRef(false);

  const registerActiveConversation = useCallback((id: string) => {
    activeConversationIds.current.add(id);
  }, []);

  const unregisterActiveConversation = useCallback((id: string) => {
    activeConversationIds.current.delete(id);
  }, []);

  // Helper: cancel a pending typing-timeout for a user in a conversation
  const clearTypingTimer = useCallback((conversationId: string, userId: string) => {
    const convMap = typingTimers.current.get(conversationId);
    if (!convMap) return;
    const timer = convMap.get(userId);
    if (timer !== undefined) {
      clearTimeout(timer);
      convMap.delete(userId);
    }
  }, []);

  // Helper: find a loaded message by id. Message-scoped socket events carry the
  // conversationId, which narrows the search to that one bucket; the full scan
  // is the fallback for servers predating that field on the payload.
  const findMessage = useCallback(
    (messageId: string, conversationId?: string): ChatMessage | null => {
      if (conversationId) {
        const bucket = messagesRef.current[conversationId];
        return bucket?.items?.find((m) => m.id === messageId) ?? null;
      }
      for (const bucket of Object.values(messagesRef.current)) {
        const found = bucket.items?.find((m) => m.id === messageId);
        if (found) return found;
      }
      return null;
    },
    []
  );

  // Helper: remove a userId from the Redux typing list for a conversation
  const removeTypingUser = useCallback(
    (conversationId: string, userId: string) => {
      // We can't use the selector inside a callback without re-reading,
      // so we derive the current array from the state ref we keep in messagesRef.
      // Actually for typing we need the current typingUsers — but that's a separate ref.
      // Simplest: dispatch with the current stored typing users derived from our own
      // typing timer map (we know who is in the map = who is typing).
      const convMap = typingTimers.current.get(conversationId);
      const typingUserIds = convMap ? Array.from(convMap.keys()) : [];
      dispatch(
        setTypingUsers({
          conversationId,
          userIds: typingUserIds.filter((id) => id !== userId),
        })
      );
    },
    [dispatch]
  );

  // ── Authoritative unread-summary refetch ─────────────────────────────────────
  // Fetches the server's total unread counts and writes them into the store.
  // This is the single source of truth for global counters whenever an event
  // touches a conversation not represented in the loaded list (insert/remove of
  // a not-loaded conversation) — client-side arithmetic there is the
  // double-count trap the live-list plan forbids.
  const refetchUnreadSummary = useCallback(async (): Promise<void> => {
    if (!projectId || !accessToken) return;
    try {
      const { data } = await axiosPrivate.get<{
        totalUnread: number;
        unreadConversationCount: number;
      }>(`/${projectId}/chat/conversations/unread-count`);
      dispatch(
        setUnreadSummary({
          totalUnread: data.totalUnread,
          unreadConversationCount: data.unreadConversationCount,
        })
      );
    } catch {
      // Non-critical — badge will update via socket events as messages arrive
    }
  }, [projectId, accessToken, axiosPrivate, dispatch]);

  // Keep the latest refetch closure in a ref so the debounce/socket handlers
  // (bound once) always call the current one.
  const refetchUnreadSummaryRef = useRef(refetchUnreadSummary);
  useEffect(() => {
    refetchUnreadSummaryRef.current = refetchUnreadSummary;
  }, [refetchUnreadSummary]);

  // Debounced trigger — collapses a burst of events across many not-loaded
  // conversations into a single authoritative summary refetch.
  const scheduleUnreadSummaryRefetch = useCallback(() => {
    if (unreadDebounceRef.current) clearTimeout(unreadDebounceRef.current);
    unreadDebounceRef.current = setTimeout(() => {
      unreadDebounceRef.current = null;
      void refetchUnreadSummaryRef.current();
    }, 800);
  }, []);

  // Fetch a single preview for a not-loaded conversation and insert it into the
  // inbox. Deduped by in-flight set; no-ops if the conversation is (now) loaded.
  // Errors are swallowed — the reconnect refresh / next event self-heals.
  const fetchAndInsertPreview = useCallback(
    async (conversationId: string): Promise<void> => {
      if (inFlightPreviews.current.has(conversationId)) return;
      if (conversationListRef.current.some((c) => c.id === conversationId)) {
        return;
      }
      inFlightPreviews.current.add(conversationId);
      try {
        const preview = await fetchPreviewRef.current({ conversationId });
        dispatch(insertConversationPreview(preview));
      } catch {
        // ignore — self-heals via reconnect refresh or a later event
      } finally {
        inFlightPreviews.current.delete(conversationId);
      }
    },
    [dispatch]
  );

  // Remove a conversation from the inbox and reconcile the globals. If the row
  // was loaded, removeConversationPreview adjusts the counters exactly from its
  // known unreadCount; if it was NOT loaded we can't know its unread, so defer
  // to the debounced authoritative refetch instead of guessing.
  const removeAndReconcile = useCallback(
    (conversationId: string): void => {
      const wasLoaded = conversationListRef.current.some(
        (c) => c.id === conversationId
      );
      dispatch(removeConversationPreview(conversationId));
      if (!wasLoaded) scheduleUnreadSummaryRefetch();
    },
    [dispatch, scheduleUnreadSummaryRefetch]
  );

  // ── Unread summary fetch on mount / auth change ──────────────────────────────
  // Fetch total unread counts once auth is ready so global badges (e.g. sidebar)
  // are accurate before the user ever loads the conversation list.
  useEffect(() => {
    void refetchUnreadSummary();
  }, [refetchUnreadSummary]);

  // ── Main socket creation effect ─────────────────────────────────────────────
  const hasToken = Boolean(accessToken);

  useEffect(() => {
    if (!projectId || !accessToken) return;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      query: { projectId },
      autoConnect: true,
    }) as Socket<ServerToClientEvents, ClientToServerEvents>;

    socketRef.current = socket;
    setSocketState(socket);
    prevTokenRef.current = accessToken;

    // ── Connection state ────────────────────────────────────────────────────
    socket.on("connect", () => {
      setConnected(true);
      dispatch(setSocketConnected(true));
      // Reconnect reconciliation: on every connect *after* the first, the
      // socket has re-registered its rooms server-side; refetch the
      // authoritative unread summary to correct anything missed while down.
      // (useConversations refreshes the list itself on the same transition.)
      if (hasConnectedRef.current) {
        void refetchUnreadSummaryRef.current();
      }
      hasConnectedRef.current = true;
    });

    socket.on("disconnect", () => {
      setConnected(false);
      dispatch(setSocketConnected(false));
    });

    // ── message:created ─────────────────────────────────────────────────────
    socket.on("message:created", (message) => {
      dispatch(upsertMessage(message));

      const isLoaded = conversationListRef.current.some(
        (c) => c.id === message.conversationId
      );

      if (isLoaded) {
        // Already in the inbox — bump + reorder and increment unread as before.
        dispatch(
          upsertConversationPreview({
            conversationId: message.conversationId,
            patch: {
              lastMessageAt: message.createdAt,
              lastMessage: message,
            },
          })
        );
        if (!activeConversationIds.current.has(message.conversationId)) {
          dispatch(incrementUnread(message.conversationId));
        }
      } else {
        // Not loaded (paginated out, or brand new with a first message):
        // fetch-and-insert the preview so it bumps to the top, and let the
        // debounced authoritative refetch own the global counters — never
        // guess them from client arithmetic for not-loaded conversations.
        void fetchAndInsertPreview(message.conversationId);
        scheduleUnreadSummaryRefetch();
      }
    });

    // ── message:updated ─────────────────────────────────────────────────────
    socket.on("message:updated", (payload) => {
      const existing = findMessage(payload.messageId, payload.conversationId);
      if (existing) {
        dispatch(
          upsertMessage({
            ...existing,
            content: payload.content,
            gif: payload.gif,
            mentions: payload.mentions,
            metadata: payload.metadata,
            editedAt: payload.editedAt,
          })
        );
      }
    });

    // ── message:deleted ─────────────────────────────────────────────────────
    socket.on("message:deleted", (payload) => {
      const existing = findMessage(payload.messageId, payload.conversationId);
      if (existing) {
        dispatch(
          upsertMessage({
            ...existing,
            userDeletedAt: payload.userDeletedAt,
            content: null,
            gif: null,
            mentions: [],
            metadata: {},
            files: undefined,
          })
        );
      }
    });

    // ── message:removed ─────────────────────────────────────────────────────
    socket.on("message:removed", (payload) => {
      const existing = findMessage(payload.messageId, payload.conversationId);
      if (existing) {
        dispatch(
          upsertMessage({
            ...existing,
            moderationStatus: "removed" as const,
          })
        );
      }
    });

    // ── message:reaction ────────────────────────────────────────────────────
    socket.on("message:reaction", (payload) => {
      // Servers before the conversationId fix omit it from this payload; fall
      // back to the loaded message so the event isn't silently dropped (an
      // undefined conversationId misses the message bucket entirely).
      const conversationId =
        payload.conversationId ??
        findMessage(payload.messageId)?.conversationId;
      if (!conversationId) return;

      dispatch(
        updateReactions({
          conversationId,
          messageId: payload.messageId,
          reactionCounts: payload.reactionCounts,
          userId: payload.userId,
          emoji: payload.emoji,
          delta: payload.delta,
          currentUserId: currentUserIdRef.current ?? "",
        })
      );
    });

    // ── message:grant ───────────────────────────────────────────────────────
    socket.on("message:grant", (payload) => {
      // Same conversationId fallback as message:reaction: an undefined
      // conversationId misses the message bucket entirely, so recover it from
      // the loaded message rather than dropping the event.
      const conversationId =
        payload.conversationId ??
        findMessage(payload.messageId)?.conversationId;
      if (!conversationId) return;

      dispatch(
        updateGrants({
          conversationId,
          messageId: payload.messageId,
          grant: payload.grant,
          // The server sends `{ total, count }` only — `viewerTotal` is
          // per-viewer and is derived in the reducer.
          summary: payload.summary,
          currentUserId: currentUserIdRef.current ?? "",
        })
      );
    });

    // ── thread:reply_count ──────────────────────────────────────────────────
    socket.on("thread:reply_count", (payload) => {
      const existing = findMessage(payload.messageId, payload.conversationId);
      if (existing) {
        dispatch(
          upsertMessage({
            ...existing,
            threadReplyCount: payload.threadReplyCount,
          })
        );
      }
    });

    // ── typing:start ────────────────────────────────────────────────────────
    socket.on("typing:start", ({ userId, conversationId }) => {
      // Ignore self-loop (multiple tabs)
      if (userId === currentUserIdRef.current) return;

      // Reset the 5-second auto-timeout for this user
      clearTypingTimer(conversationId, userId);
      if (!typingTimers.current.has(conversationId)) {
        typingTimers.current.set(conversationId, new Map());
      }
      const convMap = typingTimers.current.get(conversationId)!;

      // Add to Redux typing list if not already present
      const currentTyping = Array.from(convMap.keys());
      if (!currentTyping.includes(userId)) {
        dispatch(
          setTypingUsers({
            conversationId,
            userIds: [...currentTyping, userId],
          })
        );
      }

      // Set timeout to auto-remove after 5 seconds without a keep-alive
      const timer = setTimeout(() => {
        removeTypingUser(conversationId, userId);
        typingTimers.current.get(conversationId)?.delete(userId);
      }, 5000);
      convMap.set(userId, timer);
    });

    // ── typing:stop ─────────────────────────────────────────────────────────
    socket.on("typing:stop", ({ userId, conversationId }) => {
      clearTypingTimer(conversationId, userId);
      removeTypingUser(conversationId, userId);
    });

    // ── conversation:updated ────────────────────────────────────────────────
    socket.on("conversation:updated", (patch) => {
      const existing = conversationsRef.current[patch.id]?.data;
      if (existing) {
        dispatch(setConversation({ ...existing, ...patch }));
      }
    });

    // ── conversation:created ────────────────────────────────────────────────
    // The user was added to a brand-new conversation. The server sends a full
    // preview; insert it directly. Defensively fall back to a fetch if a future
    // emitter ever sends only an id.
    socket.on("conversation:created", (preview) => {
      if (preview && typeof preview === "object" && "unreadCount" in preview) {
        dispatch(insertConversationPreview(preview));
      } else {
        const id = (preview as { id?: string } | null)?.id;
        if (id) void fetchAndInsertPreview(id);
      }
    });

    // ── member:left (self) ──────────────────────────────────────────────────
    // When the current user leaves / is removed from a conversation, drop it
    // from the inbox. (ConversationProvider separately handles the open-chat
    // case for the conversation it's scoped to.)
    socket.on("member:left", ({ userId, conversationId }) => {
      if (userId === currentUserIdRef.current) {
        removeAndReconcile(conversationId);
      }
    });

    // ── conversation:deleted (inbox-level) ──────────────────────────────────
    // Remove the row from the inbox even when the user doesn't have it open.
    // ConversationProvider keeps its own handler for the open-chat teardown.
    socket.on("conversation:deleted", ({ conversationId }) => {
      removeAndReconcile(conversationId);
    });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setConnected(false);
      dispatch(setSocketConnected(false));

      // Clear all pending typing timers
      Array.from(typingTimers.current.values()).forEach((convMap) => {
        Array.from(convMap.values()).forEach((timer) => {
          clearTimeout(timer);
        });
      });
      typingTimers.current.clear();

      // Clear the pending unread-summary debounce and reset reconnect tracking
      if (unreadDebounceRef.current) {
        clearTimeout(unreadDebounceRef.current);
        unreadDebounceRef.current = null;
      }
      hasConnectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, hasToken]);

  // ── Token refresh effect ────────────────────────────────────────────────────
  // When the access token rotates (same socket, new credentials), update socket.auth
  // and force a fresh handshake. Must NOT re-create the socket — that would clear all
  // room memberships. Instead: update auth object, then disconnect().connect().
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !accessToken) return;
    if (prevTokenRef.current === accessToken) return;

    prevTokenRef.current = accessToken;
    // socket.auth must be updated BEFORE disconnect().connect() —
    // Socket.io auto-reconnect reuses the original auth object.
    (socket as any).auth = { token: accessToken };
    socket.disconnect().connect();
  }, [accessToken]);

  return (
    <ChatContext.Provider
      value={{
        socket: socketState,
        connected,
        registerActiveConversation,
        unregisterActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
