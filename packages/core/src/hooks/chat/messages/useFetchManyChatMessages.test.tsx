import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeChatMessage } from "../../../test-utils";
import useFetchManyChatMessages, {
  type FetchManyChatMessagesResponse,
} from "./useFetchManyChatMessages";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(
  overrides: Partial<FetchManyChatMessagesResponse> = {},
): FetchManyChatMessagesResponse {
  return {
    messages: [makeChatMessage()],
    hasMore: false,
    oldestCreatedAt: "2024-01-01T00:00:00.000Z",
    newestCreatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("useFetchManyChatMessages", () => {
  it("fetches a page of messages with the expected default params", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    const page = makePage();
    axiosPrivate.mockResponse("get", page);

    let returned: FetchManyChatMessagesResponse | undefined;
    await act(async () => {
      returned = await result.current({ conversationId: "conversation-1" });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/chat/conversations/conversation-1/messages");
    expect(call.config?.params).toMatchObject({ limit: 50 });
    expect(call.config?.params).not.toHaveProperty("parentId");
    expect(call.config?.params).not.toHaveProperty("before");
    expect(call.config?.params).not.toHaveProperty("after");
  });

  it("includes optional params when provided", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    axiosPrivate.mockResponse("get", makePage());

    await act(async () => {
      await result.current({
        conversationId: "conversation-1",
        parentId: "message-1",
        before: "2024-01-02T00:00:00.000Z",
        limit: 20,
        sort: "asc",
        includeFiles: true,
        filters: { hasReplies: true },
        spaceReputationId: "space-1",
        spaceReputationDescendants: true,
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({
      limit: 20,
      sort: "asc",
      parentId: "message-1",
      before: "2024-01-02T00:00:00.000Z",
      include: "files",
      filters: { hasReplies: true },
      spaceReputationId: "space-1",
      spaceReputationDescendants: true,
    });
  });

  it("sends include=grants when includeGrants is set", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    axiosPrivate.mockResponse("get", makePage());

    await act(async () => {
      await result.current({
        conversationId: "conversation-1",
        includeGrants: true,
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params.include).toBe("grants");
  });

  it("composes both tokens into one include param when files and grants are both requested", async () => {
    // The endpoint takes a single `include`, so the two must not overwrite each
    // other. The server splits on commas and trims, so this reaches both of its
    // parsers intact.
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    axiosPrivate.mockResponse("get", makePage());

    await act(async () => {
      await result.current({
        conversationId: "conversation-1",
        includeFiles: true,
        includeGrants: true,
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params.include).toBe("files,grants");
  });

  it("omits include entirely when neither token is requested", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    axiosPrivate.mockResponse("get", makePage());

    await act(async () => {
      await result.current({ conversationId: "conversation-1" });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).not.toHaveProperty("include");
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ conversationId: "conversation-1" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyChatMessages(),
      { projectId: "" },
    );

    await expect(
      result.current({ conversationId: "conversation-1" }),
    ).rejects.toThrow("No project specified");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when there is no conversationId", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyChatMessages());

    await expect(
      result.current({ conversationId: "" }),
    ).rejects.toThrow("No conversation specified");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
