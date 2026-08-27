import { useCallback, useEffect, useRef } from "react";
import { useSublayDispatch, useSublaySelector } from "../../../store/hooks";
import {
  selectMessages,
  selectMessagesLoading,
  selectMessagesHasMore,
  selectThreadReplies,
  selectThreadLoading,
  selectThreadHasMore,
  upsertMessage,
  setMessagesLoading,
  setMessagesHasMore,
  setThreadReplies,
  setThreadLoading,
} from "../../../store/slices/chatSlice";
import { ChatMessage } from "../../../interfaces/models/ChatMessage";
import useProject from "../../projects/useProject";
import { handleError } from "../../../utils/handleError";
import useFetchManyChatMessages from "./useFetchManyChatMessages";

export interface UseLiveChatMessagesProps {
  conversationId: string;
  parentId?: string | null;
  limit?: number;
  includeFiles?: boolean;
  /**
   * When `true`, each message carries its `grants` reputation-grant summary.
   * Needed for grants to survive a reload or a scroll into history — the
   * `message:grant` socket event only covers grants issued while the
   * conversation is open.
   */
  includeGrants?: boolean;
}

export interface UseLiveChatMessagesValues {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  loadOlder: () => Promise<void>;
}

/**
 * Live, store-backed view of a conversation's messages. Reads from the shared
 * Redux bucket that `ChatProvider` keeps in sync via socket events, so new
 * messages, edits, reactions and reply-count changes appear in real time, and
 * state is shared with `useSendMessage` (optimistic inserts), unread tracking
 * and reconnect catch-up.
 *
 * This is the canonical conversation surface. For a read-only / filtered query
 * that should NOT be polluted by live traffic, use
 * `useFetchManyChatMessagesWrapper` instead.
 */
function useLiveChatMessages({
  conversationId,
  parentId,
  limit = 50,
  includeFiles,
  includeGrants,
}: UseLiveChatMessagesProps): UseLiveChatMessagesValues {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();
  const fetchMany = useFetchManyChatMessages();

  const isThread = Boolean(parentId);

  // Read from the correct Redux bucket
  const mainMessages = useSublaySelector(selectMessages(conversationId));
  const mainLoading = useSublaySelector(selectMessagesLoading(conversationId));
  const mainHasMore = useSublaySelector(selectMessagesHasMore(conversationId));

  const threadMessages = useSublaySelector(
    selectThreadReplies(parentId ?? "")
  );
  const threadLoading = useSublaySelector(selectThreadLoading(parentId ?? ""));
  const threadHasMore = useSublaySelector(
    selectThreadHasMore(parentId ?? "")
  );

  const messages = isThread ? threadMessages : mainMessages;
  const loading = isThread ? threadLoading : mainLoading;
  const hasMore = isThread ? threadHasMore : mainHasMore;

  // Keep fresh refs to message arrays so loadOlder can read cursors without
  // closing over stale state
  const mainMessagesRef = useRef(mainMessages);
  mainMessagesRef.current = mainMessages;
  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  // Fetch a page of messages.
  // `before` is an ISO 8601 timestamp — the server queries messages created
  // before this point in time (not a UUID cursor).
  const fetchPage = useCallback(
    async (before: string | null) => {
      if (!projectId || !conversationId) return;

      try {
        const { messages: items, hasMore: more } = await fetchMany({
          conversationId,
          parentId,
          before,
          limit,
          sort: isThread ? "asc" : "desc",
          includeFiles,
          includeGrants,
        });

        if (isThread) {
          // Thread replies come back ASC — dispatch as-is
          dispatch(
            setThreadReplies({
              parentMessageId: parentId!,
              messages: items,
              hasMore: more,
            })
          );
        } else {
          // Main stream comes back DESC (newest first for cursor efficiency).
          // Redux stores messages ASC — reverse before dispatching.
          const ascending = [...items].reverse();
          ascending.forEach((msg) => dispatch(upsertMessage(msg)));
          dispatch(setMessagesHasMore({ conversationId, hasMore: more }));
        }
      } catch (err) {
        handleError(err, "Failed to load messages");
      }
    },
    [projectId, conversationId, parentId, isThread, limit, includeFiles, includeGrants, fetchMany, dispatch]
  );

  // Initial fetch on mount
  useEffect(() => {
    if (!projectId || !conversationId) return;

    const initialFetch = async () => {
      if (isThread) {
        dispatch(setThreadLoading({ parentMessageId: parentId!, loading: true }));
      } else {
        dispatch(setMessagesLoading({ conversationId, loading: true }));
      }

      await fetchPage(null);

      if (isThread) {
        dispatch(setThreadLoading({ parentMessageId: parentId!, loading: false }));
      } else {
        dispatch(setMessagesLoading({ conversationId, loading: false }));
      }
    };

    initialFetch();
    // Re-runs on the conversation/thread identity AND on the two include
    // flags, which change what a message row CONTAINS: flipping `includeGrants`
    // (or `includeFiles`) on a mounted hook has to refetch, or the caller has
    // toggled a prop that silently does nothing until the conversation changes.
    //
    // `fetchPage` is deliberately left out even though it is called here. It is
    // a `useCallback` over exactly these deps plus `fetchMany`/`dispatch`, so
    // listing it would add nothing but the risk of a refetch loop if either of
    // those two ever stops being stable. The two flags are primitives, so no
    // re-render can re-arm this effect on identity alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, conversationId, parentId, includeFiles, includeGrants]);

  // Load more messages:
  // - Main stream: fetch older messages using `before` cursor (oldest loaded createdAt)
  // - Thread: fetch newer replies using `after` cursor (newest loaded createdAt), append
  const loadOlder = useCallback(async () => {
    if (loading || !hasMore) return;

    if (isThread) {
      const currentItems = threadMessagesRef.current;
      const newest = currentItems[currentItems.length - 1];
      if (!newest || !parentId || !projectId || !conversationId) return;

      const after = new Date(newest.createdAt).toISOString();
      dispatch(setThreadLoading({ parentMessageId: parentId, loading: true }));
      try {
        const { messages: newItems, hasMore: more } = await fetchMany({
          conversationId,
          parentId,
          after,
          limit,
          sort: "asc",
          includeFiles,
          includeGrants,
        });
        dispatch(
          setThreadReplies({
            parentMessageId: parentId,
            messages: [...currentItems, ...newItems],
            hasMore: more,
          })
        );
      } catch (err) {
        handleError(err, "Failed to load more thread replies");
      } finally {
        dispatch(setThreadLoading({ parentMessageId: parentId, loading: false }));
      }
      return;
    }

    const oldest = mainMessagesRef.current[0];
    if (!oldest) return;

    const before = new Date(oldest.createdAt).toISOString();
    dispatch(setMessagesLoading({ conversationId, loading: true }));
    await fetchPage(before);
    dispatch(setMessagesLoading({ conversationId, loading: false }));
  }, [loading, hasMore, isThread, parentId, projectId, conversationId, limit, includeFiles, includeGrants, fetchMany, dispatch, fetchPage]);

  return { messages, loading, hasMore, loadOlder };
}

export default useLiveChatMessages;
