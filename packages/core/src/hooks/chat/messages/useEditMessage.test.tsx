import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeChatMessage } from "../../../test-utils";
import useEditMessage from "./useEditMessage";
import { selectMessages } from "../../../store/slices/chatSlice";
import type { ChatMessage } from "../../../interfaces/models/ChatMessage";

afterEach(() => {
  resetAxiosMocks();
});

describe("useEditMessage", () => {
  it("patches the message and upserts the result into the store", async () => {
    const updated = makeChatMessage({ id: "message-1", content: "edited", editedAt: "2024-01-02T00:00:00.000Z" });

    const { result, store, axiosPrivate } = renderHookWithAxios(() => useEditMessage());
    axiosPrivate.mockResponse("patch", updated);

    let returned: ChatMessage | undefined;
    await act(async () => {
      returned = await result.current({
        conversationId: "conversation-1",
        messageId: "message-1",
        content: "edited",
      });
    });

    expect(returned).toEqual(updated);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/test-project/chat/conversations/conversation-1/messages/message-1");
    expect(call.body).toMatchObject({ content: "edited" });

    const messages = selectMessages("conversation-1")(store.getState());
    expect(messages).toEqual([updated]);
  });

  it("sends gif/mentions/metadata in the request body", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useEditMessage());
    axiosPrivate.mockResponse("patch", makeChatMessage());

    await act(async () => {
      await result.current({
        conversationId: "conversation-1",
        messageId: "message-1",
        gif: null,
        mentions: [{ id: "user-2", indices: [0, 1] } as any],
        metadata: { source: "test" },
      });
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.body).toMatchObject({
      gif: null,
      mentions: [{ id: "user-2", indices: [0, 1] }],
      metadata: { source: "test" },
    });
  });

  it("sends a gif as an object, matching the shape the server stores", async () => {
    // The server's edit schema once expected a bare URL string here, so every
    // edit carrying a GIF 400'd. Lock the object shape from this side too.
    const gif = {
      id: "gif-1",
      url: "https://media.example.com/watch/gif-1",
      gifUrl: "https://media.example.com/gif-1.gif",
      gifPreviewUrl: "https://media.example.com/gif-1-preview.gif",
      altText: "a cat waving",
      aspectRatio: "1.5",
    };

    const { result, axiosPrivate } = renderHookWithAxios(() => useEditMessage());
    axiosPrivate.mockResponse("patch", makeChatMessage());

    await act(async () => {
      await result.current({
        conversationId: "conversation-1",
        messageId: "message-1",
        gif,
      });
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.body).toMatchObject({ gif });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useEditMessage());

    axiosPrivate.mockError("patch", 500, { message: "Internal error" });

    await expect(
      result.current({ conversationId: "conversation-1", messageId: "message-1", content: "edited" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when there is no projectId", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useEditMessage(), {
      projectId: "",
    });

    await expect(
      result.current({ conversationId: "conversation-1", messageId: "message-1", content: "edited" }),
    ).rejects.toThrow("No projectId available.");
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
