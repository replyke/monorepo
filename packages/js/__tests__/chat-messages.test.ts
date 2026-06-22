import {
  deleteMessage,
  editMessage,
  getMessage,
  listMessages,
  listReactions,
  markAsRead,
  reportMessage,
  sendMessage,
  toggleReaction,
} from "../src/modules/chat";
import { formDataToObject, makeClient } from "./helpers/client";

describe("js-sdk chat messages — request shaping", () => {
  it("listMessages strips conversationId into the path and uses cursor pagination (before/after/limit) as params", async () => {
    const { client, projectInstance } = makeClient();
    await listMessages(client, {
      conversationId: "c1",
      before: "2026-06-01T00:00:00Z",
      limit: 50,
      sort: "desc",
      include: "files",
      filters: { hasReplies: true },
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages",
      {
        params: {
          before: "2026-06-01T00:00:00Z",
          limit: 50,
          sort: "desc",
          include: "files",
          filters: { hasReplies: true },
        },
      }
    );
  });

  it("listMessages supports the 'after' cursor variant (mutually exclusive with 'before')", async () => {
    const { client, projectInstance } = makeClient();
    await listMessages(client, {
      conversationId: "c1",
      after: "2026-06-01T00:00:00Z",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages",
      { params: { after: "2026-06-01T00:00:00Z" } }
    );
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("before");
  });

  it("listMessages forwards parentId for thread views and spaceReputation params", async () => {
    const { client, projectInstance } = makeClient();
    await listMessages(client, {
      conversationId: "c1",
      parentId: "m1",
      spaceReputationId: "space1",
      spaceReputationDescendants: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages",
      {
        params: {
          parentId: "m1",
          spaceReputationId: "space1",
          spaceReputationDescendants: true,
        },
      }
    );
  });

  it("getMessage strips conversationId/messageId into the path and forwards spaceReputation params", async () => {
    const { client, projectInstance } = makeClient();
    await getMessage(client, {
      conversationId: "c1",
      messageId: "m1",
      spaceReputationId: "none",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1",
      { params: { spaceReputationId: "none" } }
    );
  });

  it("editMessage strips conversationId/messageId into the path and patches the rest as JSON", async () => {
    const { client, projectInstance } = makeClient();
    await editMessage(client, {
      conversationId: "c1",
      messageId: "m1",
      content: "edited text",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1",
      { content: "edited text" }
    );
  });

  it("editMessage forwards gif: null to clear an existing gif", async () => {
    const { client, projectInstance } = makeClient();
    await editMessage(client, {
      conversationId: "c1",
      messageId: "m1",
      gif: null,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1",
      { gif: null }
    );
  });

  it("deleteMessage deletes /chat/conversations/:conversationId/messages/:messageId with no body", async () => {
    const { client, projectInstance } = makeClient();
    await deleteMessage(client, { conversationId: "c1", messageId: "m1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1"
    );
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("sendMessage posts JSON to /chat/conversations/:conversationId/messages with spaceReputation params forwarded as query, not body", async () => {
    const { client, projectInstance } = makeClient();
    await sendMessage(client, {
      conversationId: "c1",
      content: "hello",
      spaceReputationId: "space1",
      spaceReputationDescendants: false,
    });

    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages",
      { content: "hello" },
      { params: { spaceReputationId: "space1", spaceReputationDescendants: false } }
    );
  });

  it("sendMessage sends multipart/FormData when files are attached, JSON-stringifying object/array fields", async () => {
    const { client, projectInstance } = makeClient();
    const file1 = new File(["a"], "photo.png", { type: "image/png" });
    const file2 = new File(["b"], "doc.pdf", { type: "application/pdf" });
    const mentions = [{ type: "user" as const, id: "u1", username: "alice" }];

    await sendMessage(client, {
      conversationId: "c1",
      content: "see attached",
      mentions,
      metadata: { source: "test" },
      files: [file1, file2],
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    const [path, body, config] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/chat/conversations/c1/messages");
    expect(body).toBeInstanceOf(FormData);
    expect(config).toEqual({ params: { spaceReputationId: undefined, spaceReputationDescendants: undefined } });

    const formData = body as FormData;
    const fileEntries = formData.getAll("files");
    expect(fileEntries).toHaveLength(2);
    expect((fileEntries[0] as File).name).toBe("photo.png");
    expect((fileEntries[1] as File).name).toBe("doc.pdf");

    const fields = formDataToObject(formData);
    expect(fields.content).toBe("see attached");
    expect(fields.mentions).toBe(JSON.stringify(mentions));
    expect(fields.metadata).toBe(JSON.stringify({ source: "test" }));
  });

  it("sendMessage falls back to a generic filename for a nameless Blob attachment", async () => {
    const { client, projectInstance } = makeClient();
    const blob = new Blob(["raw-bytes"], { type: "image/png" });

    await sendMessage(client, {
      conversationId: "c1",
      files: [blob],
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const formData = body as FormData;
    const entries = formData.getAll("files");
    expect(entries).toHaveLength(1);
    expect((entries[0] as File).name).toBe("attachment");
  });

  it("sendMessage takes the JSON path (not multipart) when files is an empty array", async () => {
    const { client, projectInstance } = makeClient();
    await sendMessage(client, {
      conversationId: "c1",
      content: "no attachments",
      files: [],
    });

    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toBeInstanceOf(FormData);
    expect(body).not.toHaveProperty("files");
    expect(body).toEqual({ content: "no attachments" });
  });

  it("toggleReaction posts the emoji to /chat/conversations/:conversationId/messages/:messageId/reactions", async () => {
    const { client, projectInstance } = makeClient();
    await toggleReaction(client, {
      conversationId: "c1",
      messageId: "m1",
      emoji: "👍",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1/reactions",
      { emoji: "👍" }
    );
  });

  it("listReactions strips conversationId/messageId into the path and sends emoji + pagination as params", async () => {
    const { client, projectInstance } = makeClient();
    await listReactions(client, {
      conversationId: "c1",
      messageId: "m1",
      emoji: "👍",
      page: 2,
      limit: 50,
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1/reactions",
      { params: { emoji: "👍", page: 2, limit: 50 } }
    );
  });

  it("markAsRead posts messageId to /chat/conversations/:conversationId/read", async () => {
    const { client, projectInstance } = makeClient();
    await markAsRead(client, { conversationId: "c1", messageId: "m1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/c1/read",
      { messageId: "m1" }
    );
  });

  it("reportMessage strips conversationId/messageId into the path and posts the reason/details as body", async () => {
    const { client, projectInstance } = makeClient();
    await reportMessage(client, {
      conversationId: "c1",
      messageId: "m1",
      reason: "spam",
      details: "posted a link repeatedly",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/c1/messages/m1/report",
      { reason: "spam", details: "posted a link repeatedly" }
    );
  });
});

describe("js-sdk chat messages — response mapping", () => {
  it("listMessages returns the raw array + hasMore (+ cursor bookkeeping) shape — NOT a PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const payload = {
      messages: [
        { id: "m1", conversationId: "c1", content: "hi" },
        { id: "m2", conversationId: "c1", content: "there" },
      ],
      hasMore: true,
      oldestCreatedAt: "2026-06-01T00:00:00Z",
      newestCreatedAt: "2026-06-02T00:00:00Z",
    };
    projectInstance.get.mockResolvedValueOnce({ data: payload });

    const result = await listMessages(client, { conversationId: "c1" });

    expect(result).toEqual(payload);
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result).not.toHaveProperty("pagination");
    expect(result).not.toHaveProperty("data");
  });

  it("listMessages surfaces the optional notice field for unsatisfiable filter combinations", async () => {
    const { client, projectInstance } = makeClient();
    const payload = {
      messages: [],
      hasMore: false,
      oldestCreatedAt: null,
      newestCreatedAt: null,
      notice: "hasReplies filter ignored for thread replies.",
    };
    projectInstance.get.mockResolvedValueOnce({ data: payload });

    const result = await listMessages(client, {
      conversationId: "c1",
      parentId: "m1",
      filters: { hasReplies: true },
    });

    expect(result.notice).toBe(payload.notice);
  });

  it("getMessage returns the ChatMessage", async () => {
    const { client, projectInstance } = makeClient();
    const message = { id: "m1", conversationId: "c1", content: "hi" };
    projectInstance.get.mockResolvedValueOnce({ data: message });

    const result = await getMessage(client, { conversationId: "c1", messageId: "m1" });

    expect(result).toEqual(message);
  });

  it("editMessage returns the updated ChatMessage", async () => {
    const { client, projectInstance } = makeClient();
    const message = { id: "m1", content: "edited text", editedAt: "2026-06-01T00:00:00Z" };
    projectInstance.patch.mockResolvedValueOnce({ data: message });

    const result = await editMessage(client, {
      conversationId: "c1",
      messageId: "m1",
      content: "edited text",
    });

    expect(result).toEqual(message);
  });

  it("deleteMessage returns the message wrapper, including userDeletedAt when present", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { message: "Message deleted.", userDeletedAt: "2026-06-01T00:00:00Z" };
    projectInstance.delete.mockResolvedValueOnce({ data: payload });

    const result = await deleteMessage(client, { conversationId: "c1", messageId: "m1" });

    expect(result).toEqual(payload);
  });

  it("sendMessage returns the created ChatMessage (JSON path)", async () => {
    const { client, projectInstance } = makeClient();
    const message = { id: "m1", conversationId: "c1", content: "hello" };
    projectInstance.post.mockResolvedValueOnce({ data: message });

    const result = await sendMessage(client, { conversationId: "c1", content: "hello" });

    expect(result).toEqual(message);
  });

  it("sendMessage returns the created ChatMessage with files populated (multipart path)", async () => {
    const { client, projectInstance } = makeClient();
    const message = {
      id: "m1",
      conversationId: "c1",
      content: "see attached",
      files: [{ fileId: "f1", type: "image" }],
    };
    projectInstance.post.mockResolvedValueOnce({ data: message });
    const file = new File(["a"], "photo.png", { type: "image/png" });

    const result = await sendMessage(client, {
      conversationId: "c1",
      content: "see attached",
      files: [file],
    });

    expect(result).toEqual(message);
  });

  it("toggleReaction returns the ToggleReactionResponse", async () => {
    const { client, projectInstance } = makeClient();
    const payload = {
      reactionCounts: { "👍": 2 },
      userReactions: ["👍"],
      delta: 1 as const,
    };
    projectInstance.post.mockResolvedValueOnce({ data: payload });

    const result = await toggleReaction(client, {
      conversationId: "c1",
      messageId: "m1",
      emoji: "👍",
    });

    expect(result).toEqual(payload);
  });

  it("listReactions returns the data + pagination envelope of reactors", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        { user: { id: "u1", name: "Alice" }, emoji: "👍", createdAt: "2026-06-01T00:00:00Z" },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await listReactions(client, {
      conversationId: "c1",
      messageId: "m1",
      emoji: "👍",
    });

    expect(result).toEqual(envelope);
  });

  it("markAsRead returns the message wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { message: "Marked as read." };
    projectInstance.post.mockResolvedValueOnce({ data: payload });

    const result = await markAsRead(client, { conversationId: "c1", messageId: "m1" });

    expect(result).toEqual(payload);
  });

  it("reportMessage returns the message + code wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { message: "Report submitted.", code: "chat/report-received" };
    projectInstance.post.mockResolvedValueOnce({ data: payload });

    const result = await reportMessage(client, {
      conversationId: "c1",
      messageId: "m1",
      reason: "spam",
    });

    expect(result).toEqual(payload);
  });
});
