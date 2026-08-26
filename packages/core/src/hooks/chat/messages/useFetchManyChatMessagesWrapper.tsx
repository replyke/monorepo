import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "../../../interfaces/models/ChatMessage";
import { handleError } from "../../../utils/handleError";
import useFetchManyChatMessages, {
  MessageFilters,
} from "./useFetchManyChatMessages";
import { SpaceReputationContextParams } from "../../../interfaces/SpaceReputation";

export interface UseFetchManyChatMessagesWrapperProps extends SpaceReputationContextParams {
  conversationId: string;
  /** Restrict to replies of this message (thread view). */
  parentId?: string | null;
  /** Page size. Defaults to `50`. */
  limit?: number;
  /**
   * Sort direction by creation time. Defaults to `"desc"` (newest first);
   * `loadMore` then fetches older messages. With `"asc"`, `loadMore` fetches
   * newer messages.
   */
  sort?: "asc" | "desc";
  /** When `true`, the server populates the `files` field on each message. */
  includeFiles?: boolean;
  /**
   * When `true`, the server populates the `grants` reputation-grant summary on
   * each message.
   */
  includeGrants?: boolean;
  filters?: MessageFilters;
}

export interface UseFetchManyChatMessagesWrapperValues {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  /** Re-fetch the first page from scratch (e.g. to pick up new matches). */
  refetch: () => void;
}

/**
 * Batteries-included, self-contained list of conversation messages with
 * cursor pagination — keeps results in local component state, NOT Redux, and
 * does NOT subscribe to socket updates. Use this for read-only / filtered
 * queries (e.g. "messages that have replies"). For the live canonical
 * conversation stream, use `useLiveChatMessages` instead.
 */
function useFetchManyChatMessagesWrapper(
  props: UseFetchManyChatMessagesWrapperProps
): UseFetchManyChatMessagesWrapperValues {
  const {
    conversationId,
    parentId,
    limit = 50,
    sort = "desc",
    includeFiles,
    includeGrants,
    filters,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
  } = props;

  // Forwarded to the leaf fetcher, which flattens it via
  // buildSpaceReputationParams before it reaches the serializer.
  const reputation = { spaceReputation, spaceReputationId, spaceReputationDescendants };
  const reputationKey = JSON.stringify(reputation);

  const fetchMany = useFetchManyChatMessages();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Cursor for the next page, in the direction of travel: the oldest loaded
  // timestamp for "desc", the newest for "asc".
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Stable primitive for dependency arrays — `filters` is a fresh object each
  // render unless the caller memoizes it.
  const filtersKey = JSON.stringify(filters ?? {});

  const advanceCursor = useCallback(
    (res: { oldestCreatedAt: string | null; newestCreatedAt: string | null }) => {
      cursorRef.current = sort === "asc" ? res.newestCreatedAt : res.oldestCreatedAt;
    },
    [sort]
  );

  const refetch = useCallback(async () => {
    if (!conversationId) return;
    loadingRef.current = true;
    setLoading(true);
    hasMoreRef.current = true;
    setHasMore(true);
    try {
      const res = await fetchMany({
        conversationId,
        parentId,
        limit,
        sort,
        includeFiles,
        includeGrants,
        filters,
        ...reputation,
      });
      setMessages(res.messages);
      hasMoreRef.current = res.hasMore;
      setHasMore(res.hasMore);
      advanceCursor(res);
    } catch (err) {
      handleError(err, "Failed to fetch messages");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMany, conversationId, parentId, limit, sort, includeFiles, includeGrants, filtersKey, reputationKey, advanceCursor]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !cursorRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetchMany({
        conversationId,
        parentId,
        limit,
        sort,
        includeFiles,
        includeGrants,
        filters,
        ...reputation,
        ...(sort === "asc"
          ? { after: cursorRef.current }
          : { before: cursorRef.current }),
      });
      setMessages((prev) => [...prev, ...res.messages]);
      hasMoreRef.current = res.hasMore;
      setHasMore(res.hasMore);
      advanceCursor(res);
    } catch (err) {
      handleError(err, "Failed to load more messages");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMany, conversationId, parentId, limit, sort, includeFiles, includeGrants, filtersKey, reputationKey, advanceCursor]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { messages, loading, hasMore, loadMore, refetch };
}

export default useFetchManyChatMessagesWrapper;
