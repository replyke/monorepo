import { describe, it, expect } from "vitest";

import reducer, {
  insertConversationPreview,
  removeConversationPreview,
  updateGrants,
  type ChatState,
} from "./chatSlice";
import {
  makeChatMessage,
  makeConversationPreview,
  makeReputationGrant,
} from "../../test-utils";

function baseState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    conversations: {},
    conversationList: {
      items: [],
      loading: false,
      hasMore: true,
      cursor: null,
    },
    messages: {},
    threads: {},
    typingUsers: {},
    socketConnected: false,
    totalUnreadCount: null,
    unreadConversationCount: null,
    ...overrides,
  };
}

describe("chatSlice — insertConversationPreview", () => {
  it("inserts an absent preview at the correct sorted position (lastMessageAt DESC)", () => {
    const older = makeConversationPreview({
      id: "older",
      lastMessageAt: "2024-01-01T00:00:00.000Z",
    });
    const newer = makeConversationPreview({
      id: "newer",
      lastMessageAt: "2024-01-03T00:00:00.000Z",
    });
    let state = baseState({
      conversationList: {
        items: [older],
        loading: false,
        hasMore: true,
        cursor: null,
      },
    });

    state = reducer(state, insertConversationPreview(newer));

    expect(state.conversationList.items.map((c) => c.id)).toEqual([
      "newer",
      "older",
    ]);
    // Mirrored into the per-conversation entry
    expect(state.conversations["newer"]?.data?.id).toBe("newer");
  });

  it("is idempotent when the preview is already present (patch, not duplicate)", () => {
    const existing = makeConversationPreview({
      id: "c1",
      lastMessageAt: "2024-01-01T00:00:00.000Z",
      unreadCount: 2,
    });
    let state = baseState({
      conversationList: {
        items: [existing],
        loading: false,
        hasMore: true,
        cursor: null,
      },
    });

    const patched = makeConversationPreview({
      id: "c1",
      lastMessageAt: "2024-01-05T00:00:00.000Z",
      unreadCount: 5,
    });
    state = reducer(state, insertConversationPreview(patched));

    expect(state.conversationList.items).toHaveLength(1);
    expect(state.conversationList.items[0].unreadCount).toBe(5);
    expect(state.conversationList.items[0].lastMessageAt).toBe(
      "2024-01-05T00:00:00.000Z"
    );
  });

  it("never mutates the global unread counters", () => {
    let state = baseState({
      totalUnreadCount: 3,
      unreadConversationCount: 1,
    });

    const preview = makeConversationPreview({ id: "c1", unreadCount: 7 });
    state = reducer(state, insertConversationPreview(preview));

    expect(state.totalUnreadCount).toBe(3);
    expect(state.unreadConversationCount).toBe(1);
  });
});

describe("chatSlice — removeConversationPreview", () => {
  it("removes a loaded preview with unread and decrements the globals (clamped)", () => {
    const preview = makeConversationPreview({ id: "c1", unreadCount: 2 });
    let state = baseState({
      conversationList: {
        items: [preview],
        loading: false,
        hasMore: true,
        cursor: null,
      },
      conversations: {
        c1: { data: preview, loading: false, error: null },
      },
      totalUnreadCount: 5,
      unreadConversationCount: 3,
    });

    state = reducer(state, removeConversationPreview("c1"));

    expect(state.conversationList.items).toHaveLength(0);
    expect(state.totalUnreadCount).toBe(3);
    expect(state.unreadConversationCount).toBe(2);
    // Cached detail bucket dropped
    expect(state.conversations["c1"]).toBeUndefined();
  });

  it("clamps the globals at 0 and never goes negative", () => {
    const preview = makeConversationPreview({ id: "c1", unreadCount: 10 });
    let state = baseState({
      conversationList: {
        items: [preview],
        loading: false,
        hasMore: true,
        cursor: null,
      },
      totalUnreadCount: 4,
      unreadConversationCount: 0,
    });

    state = reducer(state, removeConversationPreview("c1"));

    expect(state.totalUnreadCount).toBe(0);
    expect(state.unreadConversationCount).toBe(0);
  });

  it("does not touch the globals when the removed preview had no unread", () => {
    const preview = makeConversationPreview({ id: "c1", unreadCount: 0 });
    let state = baseState({
      conversationList: {
        items: [preview],
        loading: false,
        hasMore: true,
        cursor: null,
      },
      totalUnreadCount: 5,
      unreadConversationCount: 3,
    });

    state = reducer(state, removeConversationPreview("c1"));

    expect(state.conversationList.items).toHaveLength(0);
    expect(state.totalUnreadCount).toBe(5);
    expect(state.unreadConversationCount).toBe(3);
  });

  it("no-ops on the globals when the conversation is not loaded (leaves them to the summary refetch)", () => {
    let state = baseState({
      conversationList: {
        items: [makeConversationPreview({ id: "other", unreadCount: 1 })],
        loading: false,
        hasMore: true,
        cursor: null,
      },
      totalUnreadCount: 5,
      unreadConversationCount: 3,
    });

    state = reducer(state, removeConversationPreview("not-loaded"));

    expect(state.conversationList.items).toHaveLength(1);
    expect(state.totalUnreadCount).toBe(5);
    expect(state.unreadConversationCount).toBe(3);
  });
});

describe("chatSlice — updateGrants", () => {
  function stateWithMessage(messageId = "message-1", grants?: {
    total: number;
    count: number;
    viewerTotal: number;
  }) {
    return baseState({
      messages: {
        "conversation-1": {
          items: [makeChatMessage({ id: messageId, grants })],
          loading: false,
          hasMore: false,
          oldestMessageId: messageId,
          newestMessageId: messageId,
        },
      },
    });
  }

  it("writes the server's total/count onto the message", () => {
    let state = stateWithMessage();

    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant({ senderId: "user-9", amount: 30 }),
        summary: { total: 30, count: 1 },
        currentUserId: "viewer-1",
      })
    );

    expect(state.messages["conversation-1"].items[0].grants).toEqual({
      total: 30,
      count: 1,
      // Somebody else's grant — the viewer's own total is untouched.
      viewerTotal: 0,
    });
  });

  it("derives viewerTotal locally when the viewer is the granter (the payload has none)", () => {
    let state = stateWithMessage("message-1", {
      total: 30,
      count: 1,
      viewerTotal: 5,
    });

    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant({ senderId: "viewer-1", amount: 20 }),
        summary: { total: 50, count: 2 },
        currentUserId: "viewer-1",
      })
    );

    expect(state.messages["conversation-1"].items[0].grants).toEqual({
      total: 50,
      count: 2,
      viewerTotal: 25,
    });
  });

  it("leaves viewerTotal alone for an app mint (null senderId)", () => {
    let state = stateWithMessage("message-1", {
      total: 10,
      count: 1,
      viewerTotal: 10,
    });

    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant({
          sourceType: "app",
          senderId: null,
          amount: 40,
        }),
        summary: { total: 50, count: 2 },
        currentUserId: "viewer-1",
      })
    );

    expect(state.messages["conversation-1"].items[0].grants).toEqual({
      total: 50,
      count: 2,
      viewerTotal: 10,
    });
  });

  it("stays coherent across the fetch→socket seam: server totals are absolute, viewerTotal accrues on the fetched baseline", () => {
    // Baseline as it arrives from an `includeGrants: true` page fetch: 100
    // total across 4 grants, 20 of which this viewer sent.
    let state = stateWithMessage("message-1", {
      total: 100,
      count: 4,
      viewerTotal: 20,
    });

    // Somebody else grants 30. total/count come straight from the server's
    // recompute; the viewer's own figure must not move.
    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant({ senderId: "user-9", amount: 30 }),
        summary: { total: 130, count: 5 },
        currentUserId: "viewer-1",
      })
    );
    expect(state.messages["conversation-1"].items[0].grants).toEqual({
      total: 130,
      count: 5,
      viewerTotal: 20,
    });

    // Then the viewer grants 15 themselves.
    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant({ senderId: "viewer-1", amount: 15 }),
        summary: { total: 145, count: 6 },
        currentUserId: "viewer-1",
      })
    );
    expect(state.messages["conversation-1"].items[0].grants).toEqual({
      total: 145,
      count: 6,
      // 20 from the fetch + 15 from this event — the two mechanisms compose
      // without double-counting, because only viewerTotal is incremental.
      viewerTotal: 35,
    });
  });

  it("seeds a summary from the event when the message was fetched without includeGrants", () => {
    // total/count are still exact (the server recomputes them per event);
    // viewerTotal starts from 0 because no baseline was ever loaded.
    let state = stateWithMessage("message-1");

    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant({ senderId: "viewer-1", amount: 15 }),
        summary: { total: 145, count: 6 },
        currentUserId: "viewer-1",
      })
    );

    expect(state.messages["conversation-1"].items[0].grants).toEqual({
      total: 145,
      count: 6,
      viewerTotal: 15,
    });
  });

  it("no-ops when the conversation bucket is not loaded", () => {
    const state = baseState();

    const next = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-1",
        grant: makeReputationGrant(),
        summary: { total: 10, count: 1 },
        currentUserId: "viewer-1",
      })
    );

    expect(next.messages["conversation-1"]).toBeUndefined();
  });

  it("no-ops when the message is not loaded", () => {
    let state = stateWithMessage("message-1");

    state = reducer(
      state,
      updateGrants({
        conversationId: "conversation-1",
        messageId: "message-absent",
        grant: makeReputationGrant(),
        summary: { total: 10, count: 1 },
        currentUserId: "viewer-1",
      })
    );

    expect(state.messages["conversation-1"].items[0].grants).toBeUndefined();
  });
});
