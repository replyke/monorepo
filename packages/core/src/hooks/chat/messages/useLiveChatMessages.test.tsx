import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeChatMessage } from "../../../test-utils";
import useLiveChatMessages from "./useLiveChatMessages";

afterEach(() => {
  resetAxiosMocks();
});

describe("useLiveChatMessages", () => {
  it("fetches the main stream on mount and stores messages ascending (oldest first)", async () => {
    const older = makeChatMessage({ id: "message-1", createdAt: "2024-01-01T00:00:00.000Z" });
    const newer = makeChatMessage({ id: "message-2", createdAt: "2024-01-02T00:00:00.000Z" });

    // Server returns DESC (newest first)
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLiveChatMessages({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [newer, older],
            hasMore: true,
            oldestCreatedAt: older.createdAt,
            newestCreatedAt: newer.createdAt,
          }),
      },
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Store keeps ASC order regardless of the server's DESC response
    expect(result.current.messages.map((m) => m.id)).toEqual(["message-1", "message-2"]);
    expect(result.current.hasMore).toBe(true);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/chat/conversations/conversation-1/messages");
    expect(call.config?.params).toMatchObject({ sort: "desc", limit: 50 });
  });

  it("forwards includeGrants to the request, composing it with includeFiles", async () => {
    // Without this the canonical conversation surface can never load existing
    // grants — `message:grant` only covers grants issued while it's open.
    const { result, axiosPrivate } = renderHookWithAxios(
      () =>
        useLiveChatMessages({
          conversationId: "conversation-1",
          includeFiles: true,
          includeGrants: true,
        }),
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

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params.include).toBe("files,grants");
  });

  it("omits include when includeGrants is not requested", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLiveChatMessages({ conversationId: "conversation-1" }),
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

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).not.toHaveProperty("include");
  });

  it("fetches thread replies in ascending order when parentId is provided", async () => {
    const reply = makeChatMessage({
      id: "reply-1",
      parentMessageId: "message-1",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLiveChatMessages({ conversationId: "conversation-1", parentId: "message-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [reply],
            hasMore: false,
            oldestCreatedAt: reply.createdAt,
            newestCreatedAt: reply.createdAt,
          }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([reply]);
    expect(result.current.hasMore).toBe(false);

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({ sort: "asc", parentId: "message-1" });
  });

  it("loadOlder fetches using the oldest loaded message as the before cursor", async () => {
    const oldest = makeChatMessage({ id: "message-1", createdAt: "2024-01-02T00:00:00.000Z" });
    const evenOlder = makeChatMessage({ id: "message-0", createdAt: "2024-01-01T00:00:00.000Z" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLiveChatMessages({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            messages: [oldest],
            hasMore: true,
            oldestCreatedAt: oldest.createdAt,
            newestCreatedAt: oldest.createdAt,
          }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    axiosPrivate.mockResponse("get", {
      messages: [evenOlder],
      hasMore: false,
      oldestCreatedAt: evenOlder.createdAt,
      newestCreatedAt: evenOlder.createdAt,
    });

    await act(async () => {
      await result.current.loadOlder();
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["message-0", "message-1"]);
    expect(result.current.hasMore).toBe(false);

    const calls = axiosPrivate.calls("get");
    expect(calls[1].config?.params).toMatchObject({ before: oldest.createdAt });
  });

  it("loadOlder is a no-op when there is no more data", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLiveChatMessages({ conversationId: "conversation-1" }),
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
      await result.current.loadOlder();
    });

    expect(axiosPrivate.calls("get")).toHaveLength(1);
  });

  it("does not throw and stops loading when the fetch fails", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLiveChatMessages({ conversationId: "conversation-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockError("get", 500, { message: "Internal error" }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
  });
});
