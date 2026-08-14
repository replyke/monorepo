import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useChatContext } from "./chat-context";
import { useSublayDispatch, useSublaySelector } from "../store/hooks";
import { selectNewestMessageId } from "../store/slices/chatSlice";
import useConversationData, {
  UseConversationDataValues,
} from "../hooks/chat/useConversationData";
import useMarkConversationAsRead from "../hooks/chat/useMarkConversationAsRead";
import useAxiosPrivate from "../config/useAxiosPrivate";
import useProject from "../hooks/projects/useProject";
import { upsertMessage } from "../store/slices/chatSlice";
import type { ChatMessage } from "../interfaces/models/ChatMessage";
import type { ConversationMember } from "../interfaces/models/ConversationMember";
import { handleError } from "../utils/handleError";

// ─── Context shape ────────────────────────────────────────────────────────────

export interface ConversationContextValue extends UseConversationDataValues {
  conversationId: string;
}

export const ConversationContext = createContext<
  Partial<ConversationContextValue>
>({});

export function useConversationContext(): Partial<ConversationContextValue> {
  return useContext(ConversationContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface ConversationProviderProps {
  conversationId: string;
  /** Called when the conversation is deleted by an admin */
  onDeleted?: () => void;
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({
  conversationId,
  onDeleted,
  children,
}) => {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const { socket, registerActiveConversation, unregisterActiveConversation } =
    useChatContext();

  // Read the newest message id from Redux for reconnect catch-up
  const newestMessageId = useSublaySelector(
    selectNewestMessageId(conversationId),
  );
  const newestMessageIdRef = useRef(newestMessageId);
  useEffect(() => {
    newestMessageIdRef.current = newestMessageId;
  }, [newestMessageId]);

  const mark = useMarkConversationAsRead({ conversationId });

  const catchUpMessages = useCallback(
    async (afterTimestamp: string) => {
      if (!projectId || !conversationId) return;
      try {
        const response = await axios.get(
          `/${projectId}/chat/conversations/${conversationId}/messages`,
          { params: { after: afterTimestamp, limit: 100, sort: "asc" } },
        );
        const { messages } = response.data as { messages: ChatMessage[] };
        messages.forEach((msg) => dispatch(upsertMessage(msg)));
      } catch (err) {
        handleError(err, "Failed to fetch missed messages");
      }
    },
    [projectId, conversationId, axios, dispatch],
  );

  // Keep a ref to the messages state so socket handlers can find latest messages
  const messagesRef = useRef<ChatMessage[]>([]);
  const reduxMessages = useSublaySelector(
    (state: any) => state.sublay.chat.messages[conversationId]?.items ?? [],
  );
  useEffect(() => {
    messagesRef.current = reduxMessages;
  }, [reduxMessages]);

  // ── Conversation data (messages, send, members, etc.) ─────────────────────
  // Called before the socket effects so upsertMember / removeMemberLocally are
  // available as stable callbacks in the member event handlers below.
  const data = useConversationData({ conversationId });

  // ── Room join / leave ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !conversationId) return;

    const room = conversationId;

    // Register this conversation as active (suppresses unread increments in ChatProvider)
    registerActiveConversation(room);

    // Join the Socket.io room
    socket.emit("join:conversation", { conversationId });

    // Mark as read on mount (catches up any unread before the view was opened)
    const newestId = newestMessageIdRef.current;
    if (newestId) {
      mark({ messageId: newestId });
    }

    return () => {
      socket.emit("leave:conversation", { conversationId });
      unregisterActiveConversation(room);
    };
  }, [
    socket,
    conversationId,
    registerActiveConversation,
    unregisterActiveConversation,
    mark,
  ]);

  // ── Reconnect handler ──────────────────────────────────────────────────────
  // On reconnects (not the initial connect), re-join the room and catch up on
  // messages that arrived during the disconnection window.
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Track whether the initial connect has been observed so we can distinguish
    // it from subsequent reconnects (socket.on("connect") fires on both).
    const hasConnectedOnceRef = { current: socket.connected };

    const handleConnect = async () => {
      if (!hasConnectedOnceRef.current) {
        // Initial connect — the mount effect already joined the room.
        hasConnectedOnceRef.current = true;
        return;
      }

      // True reconnect: re-join the room and catch up on missed messages.
      socket.emit("join:conversation", { conversationId });
      const newest = newestMessageIdRef.current;
      if (newest) {
        const newestMsg = messagesRef.current.find((m) => m.id === newest);
        if (newestMsg) {
          await catchUpMessages(new Date(newestMsg.createdAt).toISOString());
        }
      }
    };

    socket.on("connect", handleConnect);
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket, conversationId, catchUpMessages]);

  // ── conversation:deleted ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleDeleted = ({
      conversationId: deletedId,
    }: {
      conversationId: string;
    }) => {
      if (deletedId !== conversationId) return;
      socket.emit("leave:conversation", { conversationId });
      unregisterActiveConversation(conversationId);
      onDeleted?.();
    };

    socket.on("conversation:deleted", handleDeleted);
    return () => {
      socket.off("conversation:deleted", handleDeleted);
    };
  }, [socket, conversationId, unregisterActiveConversation, onDeleted]);

  // ── Member join / leave ────────────────────────────────────────────────────
  // Update local members state when the server broadcasts member changes.
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMemberJoined = (payload: {
      conversationId: string;
      member: ConversationMember;
    }) => {
      if (payload.conversationId !== conversationId) return;
      data.upsertMember(payload.member);
    };

    const handleMemberLeft = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      if (payload.conversationId !== conversationId) return;
      data.removeMemberLocally({ userId: payload.userId });
    };

    socket.on("member:joined", handleMemberJoined);
    socket.on("member:left", handleMemberLeft);
    return () => {
      socket.off("member:joined", handleMemberJoined);
      socket.off("member:left", handleMemberLeft);
    };
  }, [socket, conversationId, data.upsertMember, data.removeMemberLocally]);

  // ── Mark read on new messages ──────────────────────────────────────────────
  // While this conversation is mounted, each incoming message is immediately marked read.
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMessage = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      mark({ messageId: message.id });
    };

    socket.on("message:created", handleMessage);
    return () => {
      socket.off("message:created", handleMessage);
    };
  }, [socket, conversationId, mark]);

  return (
    <ConversationContext.Provider value={{ ...data, conversationId }}>
      {children}
    </ConversationContext.Provider>
  );
};
