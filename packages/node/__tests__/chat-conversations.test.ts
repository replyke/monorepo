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
import { makeClient } from "./helpers/mockClient";

describe("node-sdk chat (conversations) — request shaping", () => {
  it("listConversations hits /chat/conversations with the full body as params (cursor pagination)", async () => {
    const { client, projectInstance } = makeClient();
    await listConversations(client, { userId: "u1", cursor: "c1", cursorCreatedAt: "t1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/chat/conversations", {
      params: { userId: "u1", cursor: "c1", cursorCreatedAt: "t1" },
    });
  });

  it("createDirectConversation posts the target userId + actingUserId to /chat/conversations/direct", async () => {
    const { client, projectInstance } = makeClient();
    await createDirectConversation(client, { userId: "target1", actingUserId: "acting1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/chat/conversations/direct", {
      userId: "target1",
      actingUserId: "acting1",
    });
  });

  it("createGroupConversation posts type: 'group' plus the rest of the body", async () => {
    const { client, projectInstance } = makeClient();
    await createGroupConversation(client, { userId: "u1", name: "Team chat" });
    expect(projectInstance.post).toHaveBeenCalledWith("/chat/conversations", {
      type: "group",
      userId: "u1",
      name: "Team chat",
    });
  });

  it("getConversation strips conversationId into the path, sends userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await getConversation(client, { conversationId: "conv1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/chat/conversations/conv1", {
      params: { userId: "u1" },
    });
  });

  it("updateConversation strips conversationId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateConversation(client, { conversationId: "conv1", userId: "u1", name: "New name" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/chat/conversations/conv1", {
      userId: "u1",
      name: "New name",
    });
  });

  it("deleteConversation sends userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await deleteConversation(client, { conversationId: "conv1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/chat/conversations/conv1", {
      params: { userId: "u1" },
    });
  });

  it("getUnreadCount hits the unread-count route with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await getUnreadCount(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/unread-count",
      { params: { userId: "u1" } },
    );
  });

  it("listMembers strips conversationId into the path and passes the rest as params (offset pagination)", async () => {
    const { client, projectInstance } = makeClient();
    await listMembers(client, { conversationId: "conv1", userId: "u1", page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/chat/conversations/conv1/members",
      { params: { userId: "u1", page: 2, limit: 10 } },
    );
  });

  it("addMember posts the target userId + actingUserId to the members route", async () => {
    const { client, projectInstance } = makeClient();
    await addMember(client, { conversationId: "conv1", userId: "target1", actingUserId: "admin1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/chat/conversations/conv1/members",
      { userId: "target1", actingUserId: "admin1" },
    );
  });

  it("removeMember puts the target userId in the path, actingUserId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await removeMember(client, { conversationId: "conv1", userId: "target1", actingUserId: "admin1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/chat/conversations/conv1/members/target1",
      { params: { actingUserId: "admin1" } },
    );
  });

  it("leaveConversation sends userId as a param to the leave route", async () => {
    const { client, projectInstance } = makeClient();
    await leaveConversation(client, { conversationId: "conv1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/chat/conversations/conv1/leave",
      { params: { userId: "u1" } },
    );
  });

  it("changeMemberRole puts the target userId in the path, role + actingUserId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await changeMemberRole(client, {
      conversationId: "conv1",
      userId: "target1",
      role: "admin",
      actingUserId: "admin1",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/chat/conversations/conv1/members/target1/role",
      { role: "admin", actingUserId: "admin1" },
    );
  });
});

describe("node-sdk chat (conversations) — response mapping", () => {
  it("listConversations returns the raw { conversations, hasMore } shape, not a PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const result = { conversations: [{ id: "conv1" }], hasMore: true };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(listConversations(client, { userId: "u1" })).resolves.toEqual(result);
  });

  it("createDirectConversation returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "conv1", type: "direct" };
    projectInstance.post.mockResolvedValueOnce({ data: conversation });
    await expect(
      createDirectConversation(client, { userId: "target1", actingUserId: "acting1" }),
    ).resolves.toEqual(conversation);
  });

  it("createGroupConversation returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "conv1", type: "group" };
    projectInstance.post.mockResolvedValueOnce({ data: conversation });
    await expect(
      createGroupConversation(client, { userId: "u1" }),
    ).resolves.toEqual(conversation);
  });

  it("getConversation returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "conv1" };
    projectInstance.get.mockResolvedValueOnce({ data: conversation });
    await expect(
      getConversation(client, { conversationId: "conv1", userId: "u1" }),
    ).resolves.toEqual(conversation);
  });

  it("updateConversation returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "conv1", name: "New name" };
    projectInstance.patch.mockResolvedValueOnce({ data: conversation });
    await expect(
      updateConversation(client, { conversationId: "conv1", userId: "u1", name: "New name" }),
    ).resolves.toEqual(conversation);
  });

  it("deleteConversation resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      deleteConversation(client, { conversationId: "conv1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("getUnreadCount returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { totalUnread: 3, unreadConversationCount: 2 };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(getUnreadCount(client, { userId: "u1" })).resolves.toEqual(result);
  });

  it("listMembers returns the full PaginatedResponse envelope (offset pagination, distinct from cursor pagination above)", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ userId: "u2" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      listMembers(client, { conversationId: "conv1", userId: "u1" }),
    ).resolves.toEqual(envelope);
  });

  it("addMember returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const member = { userId: "target1", role: "member" };
    projectInstance.post.mockResolvedValueOnce({ data: member });
    await expect(
      addMember(client, { conversationId: "conv1", userId: "target1", actingUserId: "admin1" }),
    ).resolves.toEqual(member);
  });

  it("removeMember resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      removeMember(client, { conversationId: "conv1", userId: "target1", actingUserId: "admin1" }),
    ).resolves.toBeUndefined();
  });

  it("leaveConversation resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      leaveConversation(client, { conversationId: "conv1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("changeMemberRole returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const member = { userId: "target1", role: "admin" };
    projectInstance.patch.mockResolvedValueOnce({ data: member });
    await expect(
      changeMemberRole(client, {
        conversationId: "conv1",
        userId: "target1",
        role: "admin",
        actingUserId: "admin1",
      }),
    ).resolves.toEqual(member);
  });
});
