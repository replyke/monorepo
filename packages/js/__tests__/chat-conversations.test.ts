import {
  addMember,
  changeMemberRole,
  createDirectConversation,
  createGroupConversation,
  deleteConversation,
  getConversation,
  getUnreadCount,
  leaveConversation,
  listConversations,
  listMembers,
  removeMember,
  updateConversation,
} from "../src/modules/chat";
import { makeClient } from "./helpers/client";

describe("js-sdk chat conversations — request shaping", () => {
  it("listConversations gets /chat/conversations with the full query (incl. cursor params) as params", async () => {
    const { client, projectInstance } = makeClient();
    const query = {
      types: "direct,group",
      cursor: "2026-06-01T00:00:00Z",
      cursorCreatedAt: "2026-05-30T00:00:00Z",
      limit: 20,
    };
    await listConversations(client, query);
    expect(projectInstance.get).toHaveBeenCalledWith("/chat/conversations", {
      params: query,
    });
  });

  it("listConversations omits the params object's own fields when called with no args (params is undefined)", async () => {
    const { client, projectInstance } = makeClient();
    await listConversations(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/chat/conversations", {
      params: undefined,
    });
  });

  it("createGroupConversation posts to /chat/conversations with type 'group' injected", async () => {
    const { client, projectInstance } = makeClient();
    const data = {
      name: "Engineering",
      description: "Eng team chat",
      memberIds: ["u1", "u2"],
      metadata: { topic: "eng" },
    };
    await createGroupConversation(client, data);
    expect(projectInstance.post).toHaveBeenCalledWith("/chat/conversations", {
      type: "group",
      ...data,
    });
  });

  it("createDirectConversation posts the full body to /chat/conversations/direct (no actingUserId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    const data = { userId: "target1" };
    await createDirectConversation(client, data);
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/direct",
      data
    );
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("actingUserId");
  });

  it("getConversation gets /chat/conversations/:conversationId with no params", async () => {
    const { client, projectInstance } = makeClient();
    await getConversation(client, { conversationId: "c1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("updateConversation strips conversationId into the path and patches the rest as JSON", async () => {
    const { client, projectInstance } = makeClient();
    await updateConversation(client, {
      conversationId: "c1",
      name: "New name",
      postingPermission: "admins",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith("/chat/conversations/c1", {
      name: "New name",
      postingPermission: "admins",
    });
  });

  it("updateConversation forwards avatarFileId: null to clear the avatar", async () => {
    const { client, projectInstance } = makeClient();
    await updateConversation(client, {
      conversationId: "c1",
      avatarFileId: null,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith("/chat/conversations/c1", {
      avatarFileId: null,
    });
  });

  it("deleteConversation deletes /chat/conversations/:conversationId", async () => {
    const { client, projectInstance } = makeClient();
    await deleteConversation(client, { conversationId: "c1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/chat/conversations/c1"
    );
  });

  it("getUnreadCount gets /chat/conversations/unread-count with no args", async () => {
    const { client, projectInstance } = makeClient();
    await getUnreadCount(client);
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/unread-count"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });
});

describe("js-sdk chat members — request shaping", () => {
  it("listMembers strips conversationId into the path and uses offset pagination (page/limit) — NOT cursor pagination", async () => {
    const { client, projectInstance } = makeClient();
    await listMembers(client, {
      conversationId: "c1",
      page: 2,
      limit: 25,
      role: "admin",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/c1/members",
      { params: { page: 2, limit: 25, role: "admin" } }
    );
    // Contrast with listConversations/listMessages: no cursor/cursorCreatedAt/before/after here.
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("cursor");
    expect(config.params).not.toHaveProperty("before");
    expect(config.params).not.toHaveProperty("after");
  });

  it("addMember posts the target userId only (no actingUserId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await addMember(client, { conversationId: "c1", userId: "target1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/c1/members",
      { userId: "target1" }
    );
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("actingUserId");
  });

  it("removeMember deletes /chat/conversations/:conversationId/members/:userId (target in path, no actingUserId param)", async () => {
    const { client, projectInstance } = makeClient();
    await removeMember(client, { conversationId: "c1", userId: "target1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/chat/conversations/c1/members/target1"
    );
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("leaveConversation deletes /chat/conversations/:conversationId/leave with no body", async () => {
    const { client, projectInstance } = makeClient();
    await leaveConversation(client, { conversationId: "c1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/chat/conversations/c1/leave"
    );
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("changeMemberRole patches the target's role at /members/:userId/role (no actingUserId in body)", async () => {
    const { client, projectInstance } = makeClient();
    await changeMemberRole(client, {
      conversationId: "c1",
      userId: "target1",
      role: "admin",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/chat/conversations/c1/members/target1/role",
      { role: "admin" }
    );
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).not.toHaveProperty("actingUserId");
  });
});

describe("js-sdk chat conversations — response mapping", () => {
  it("listConversations returns the raw array + hasMore shape (NOT a PaginatedResponse envelope)", async () => {
    const { client, projectInstance } = makeClient();
    const payload = {
      conversations: [
        { id: "c1", type: "direct", lastMessageAt: "2026-06-01T00:00:00Z" },
        { id: "c2", type: "group", lastMessageAt: null },
      ],
      hasMore: true,
    };
    projectInstance.get.mockResolvedValueOnce({ data: payload });

    const result = await listConversations(client, { limit: 2 });

    expect(result).toEqual(payload);
    expect(Array.isArray(result.conversations)).toBe(true);
    expect(result).not.toHaveProperty("pagination");
    expect(result).not.toHaveProperty("data");
  });

  it("createGroupConversation returns the created Conversation", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "c1", type: "group", name: "Engineering" };
    projectInstance.post.mockResolvedValueOnce({ data: conversation });

    const result = await createGroupConversation(client, { name: "Engineering" });

    expect(result).toEqual(conversation);
  });

  it("createDirectConversation returns the (found-or-created) direct Conversation", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "c2", type: "direct", name: null };
    projectInstance.post.mockResolvedValueOnce({ data: conversation });

    const result = await createDirectConversation(client, { userId: "target1" });

    expect(result).toEqual(conversation);
  });

  it("getConversation returns the Conversation", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "c1", type: "direct", memberCount: 2 };
    projectInstance.get.mockResolvedValueOnce({ data: conversation });

    const result = await getConversation(client, { conversationId: "c1" });

    expect(result).toEqual(conversation);
  });

  it("updateConversation returns the updated Conversation", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "c1", name: "New name" };
    projectInstance.patch.mockResolvedValueOnce({ data: conversation });

    const result = await updateConversation(client, {
      conversationId: "c1",
      name: "New name",
    });

    expect(result).toEqual(conversation);
  });

  it("deleteConversation returns the message wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { message: "Conversation deleted." };
    projectInstance.delete.mockResolvedValueOnce({ data: payload });

    const result = await deleteConversation(client, { conversationId: "c1" });

    expect(result).toEqual(payload);
  });

  it("getUnreadCount returns the UnreadCountResponse", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { totalUnread: 7, unreadConversationCount: 3 };
    projectInstance.get.mockResolvedValueOnce({ data: payload });

    const result = await getUnreadCount(client);

    expect(result).toEqual(payload);
  });
});

describe("js-sdk chat members — response mapping", () => {
  it("listMembers returns the full PaginatedResponse envelope (data + pagination) — distinct from cursor pagination", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        { id: "m1", conversationId: "c1", userId: "u1", role: "admin" },
        { id: "m2", conversationId: "c1", userId: "u2", role: "member" },
      ],
      pagination: {
        page: 1,
        pageSize: 25,
        totalPages: 1,
        totalItems: 2,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await listMembers(client, { conversationId: "c1" });

    expect(result).toEqual(envelope);
    expect(result.pagination).toEqual(envelope.pagination);
    expect(result).not.toHaveProperty("hasMore");
  });

  it("addMember returns the created/reactivated ConversationMember", async () => {
    const { client, projectInstance } = makeClient();
    const member = { id: "m1", conversationId: "c1", userId: "target1", role: "member" };
    projectInstance.post.mockResolvedValueOnce({ data: member });

    const result = await addMember(client, { conversationId: "c1", userId: "target1" });

    expect(result).toEqual(member);
  });

  it("removeMember returns the message wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { message: "Member removed." };
    projectInstance.delete.mockResolvedValueOnce({ data: payload });

    const result = await removeMember(client, { conversationId: "c1", userId: "target1" });

    expect(result).toEqual(payload);
  });

  it("leaveConversation returns the message wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const payload = { message: "Left conversation." };
    projectInstance.delete.mockResolvedValueOnce({ data: payload });

    const result = await leaveConversation(client, { conversationId: "c1" });

    expect(result).toEqual(payload);
  });

  it("changeMemberRole returns the updated ConversationMember", async () => {
    const { client, projectInstance } = makeClient();
    const member = { id: "m1", conversationId: "c1", userId: "target1", role: "admin" };
    projectInstance.patch.mockResolvedValueOnce({ data: member });

    const result = await changeMemberRole(client, {
      conversationId: "c1",
      userId: "target1",
      role: "admin",
    });

    expect(result).toEqual(member);
  });
});
