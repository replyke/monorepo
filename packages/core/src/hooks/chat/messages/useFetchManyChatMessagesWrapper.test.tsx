import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeChatMessage } from "../../../test-utils";
import useFetchManyChatMessagesWrapper from "./useFetchManyChatMessagesWrapper";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchManyChatMessagesWrapper", () => {
  it("fetches the first page on mount, newest-first by default", async () => {
    const first = makeChatMessage({
      id: "message-1",
      createdAt: "2024-01-02T00:00:00.000Z",
    });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyChatMessagesWrapper({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [first],
            hasMore: true,
            oldestCreatedAt: first.createdAt,
            newestCreatedAt: first.createdAt,
          }),
      },
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([first]);
    expect(result.current.hasMore).toBe(true);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/chat/conversations/conversation-1/messages");
    expect(call.config?.params).toMatchObject({ limit: 50, sort: "desc" });
  });

  it("forwards includeGrants on both the first page and load-more", async () => {
    const first = makeChatMessage({
      id: "message-1",
      createdAt: "2024-01-02T00:00:00.000Z",
    });

    const { result, axiosPrivate } = renderHookWithAxios(
      () =>
        useFetchManyChatMessagesWrapper({
          conversationId: "conversation-1",
          includeGrants: true,
        }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [first],
            hasMore: true,
            oldestCreatedAt: first.createdAt,
            newestCreatedAt: first.createdAt,
          }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    axiosPrivate.mockResponse("get", {
      messages: [],
      hasMore: false,
      oldestCreatedAt: null,
      newestCreatedAt: null,
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));

    const calls = axiosPrivate.calls("get");
    expect(calls).toHaveLength(2);
    // Dropping it on page 2 would make grants vanish as the user scrolls back.
    expect(calls[0].config?.params.include).toBe("grants");
    expect(calls[1].config?.params.include).toBe("grants");
  });

  it("loads more using the oldest cursor for desc sort", async () => {
    const first = makeChatMessage({
      id: "message-1",
      createdAt: "2024-01-02T00:00:00.000Z",
    });
    const second = makeChatMessage({
      id: "message-2",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyChatMessagesWrapper({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [first],
            hasMore: true,
            oldestCreatedAt: first.createdAt,
            newestCreatedAt: first.createdAt,
          }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    axiosPrivate.mockResponse("get", {
      messages: [second],
      hasMore: false,
      oldestCreatedAt: second.createdAt,
      newestCreatedAt: second.createdAt,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["message-1", "message-2"]);
    expect(result.current.hasMore).toBe(false);

    const calls = axiosPrivate.calls("get");
    expect(calls[1].config?.params).toMatchObject({ before: first.createdAt });
  });

  it("refetches from scratch, replacing the existing list", async () => {
    const first = makeChatMessage({ id: "message-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyChatMessagesWrapper({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [first],
            hasMore: true,
            oldestCreatedAt: first.createdAt,
            newestCreatedAt: first.createdAt,
          }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const replacement = makeChatMessage({ id: "message-2" });
    axiosPrivate.mockResponse("get", {
      messages: [replacement],
      hasMore: false,
      oldestCreatedAt: replacement.createdAt,
      newestCreatedAt: replacement.createdAt,
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.messages).toEqual([replacement]);
  });

  it("does not load more while a request is already in flight or there's no more data", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyChatMessagesWrapper({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [],
            hasMore: false,
            oldestCreatedAt: null,
            newestCreatedAt: null,
          }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    // Only the initial mount fetch — no second call since hasMore is false
    // and there's no cursor.
    expect(axiosPrivate.calls("get")).toHaveLength(1);
  });

  it("surfaces errors without throwing and stops loading", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyChatMessagesWrapper({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockError("get", 500, { message: "Internal error" }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
  });
});
