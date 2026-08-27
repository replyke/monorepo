import {
  createRule,
  deleteRule,
  fetchManyRules,
  fetchRule,
  getSpaceConversation,
  handleCommentReport,
  handleEntityReport,
  handleSpaceChatReport,
  moderateSpaceChatMessage,
  moderateSpaceComment,
  moderateSpaceEntity,
  reorderRules,
  updateRule,
} from "../src/modules/spaces";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk spaces (moderation/reports) — request shaping", () => {
  it("handleEntityReport strips spaceId/reportId into the path and patches the rest, covering multiple action types", async () => {
    const { client, projectInstance } = makeClient();
    await handleEntityReport(client, {
      spaceId: "s1",
      reportId: "r1",
      entityId: "e1",
      actions: ["remove-entity", "ban-user"],
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/reports/entity/r1",
      { entityId: "e1", actions: ["remove-entity", "ban-user"] },
    );
  });

  it("handleCommentReport strips spaceId/reportId into the path and patches the rest, covering multiple action types", async () => {
    const { client, projectInstance } = makeClient();
    await handleCommentReport(client, {
      spaceId: "s1",
      reportId: "r1",
      commentId: "c1",
      actions: ["remove-comment", "dismiss"],
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/reports/comment/r1",
      { commentId: "c1", actions: ["remove-comment", "dismiss"] },
    );
  });

  it("moderateSpaceEntity strips spaceId/entityId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceEntity(client, { spaceId: "s1", entityId: "e1", action: "remove" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/entities/e1/moderation",
      { action: "remove" },
    );
  });

  it("moderateSpaceComment strips spaceId/commentId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceComment(client, { spaceId: "s1", commentId: "c1", action: "approve" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/comments/c1/moderation",
      { action: "approve" },
    );
  });

  it("getSpaceConversation sends userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await getSpaceConversation(client, { spaceId: "s1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/conversation", {
      params: { userId: "u1" },
    });
  });

  it("moderateSpaceChatMessage sends the body as-is, including optional actingUserId, with no extra client-side gating", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceChatMessage(client, {
      spaceId: "s1",
      messageId: "msg1",
      moderationStatus: "removed",
      actingUserId: "mod1",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/chat/messages/msg1/moderation",
      { moderationStatus: "removed", actingUserId: "mod1" },
    );
  });

  it("moderateSpaceChatMessage works with actingUserId omitted (backend/system action)", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceChatMessage(client, {
      spaceId: "s1",
      messageId: "msg1",
      moderationStatus: "removed",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/chat/messages/msg1/moderation",
      { moderationStatus: "removed" },
    );
  });

  it("handleSpaceChatReport sends the body as-is, including optional actingUserId, with no extra client-side gating", async () => {
    const { client, projectInstance } = makeClient();
    await handleSpaceChatReport(client, {
      spaceId: "s1",
      reportId: "r1",
      actions: ["remove-message", "ban-user"],
      userId: "target1",
      messageId: "msg1",
      actingUserId: "mod1",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/chat/reports/r1",
      {
        actions: ["remove-message", "ban-user"],
        userId: "target1",
        messageId: "msg1",
        actingUserId: "mod1",
      },
    );
  });

  it("createRule strips spaceId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await createRule(client, { spaceId: "s1", title: "Be nice" });
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces/s1/rules", {
      title: "Be nice",
    });
  });

  it("updateRule strips spaceId/ruleId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateRule(client, { spaceId: "s1", ruleId: "r1", title: "Updated" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/spaces/s1/rules/r1", {
      title: "Updated",
    });
  });

  it("deleteRule deletes /spaces/:id/rules/:ruleId", async () => {
    const { client, projectInstance } = makeClient();
    await deleteRule(client, { spaceId: "s1", ruleId: "r1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/spaces/s1/rules/r1");
  });

  it("fetchRule hits /spaces/:id/rules/:ruleId with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchRule(client, { spaceId: "s1", ruleId: "r1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/rules/r1");
  });

  it("fetchManyRules hits /spaces/:id/rules with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyRules(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/rules");
  });

  it("reorderRules patches the reorder route with ruleIds in the body", async () => {
    const { client, projectInstance } = makeClient();
    await reorderRules(client, { spaceId: "s1", ruleIds: ["r2", "r1"] });
    expect(projectInstance.patch).toHaveBeenCalledWith("/spaces/s1/rules/reorder", {
      ruleIds: ["r2", "r1"],
    });
  });
});

describe("node-sdk spaces (moderation/reports) — response mapping", () => {
  it("handleEntityReport returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "handled" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      handleEntityReport(client, {
        spaceId: "s1",
        reportId: "r1",
        entityId: "e1",
        actions: ["dismiss"],
      }),
    ).resolves.toEqual(result);
  });

  it("handleCommentReport returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "handled" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      handleCommentReport(client, {
        spaceId: "s1",
        reportId: "r1",
        commentId: "c1",
        actions: ["dismiss"],
      }),
    ).resolves.toEqual(result);
  });

  it("moderateSpaceEntity returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "moderated" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      moderateSpaceEntity(client, { spaceId: "s1", entityId: "e1", action: "remove" }),
    ).resolves.toEqual(result);
  });

  it("moderateSpaceComment returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "moderated" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      moderateSpaceComment(client, { spaceId: "s1", commentId: "c1", action: "approve" }),
    ).resolves.toEqual(result);
  });

  it("getSpaceConversation returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "conv1" };
    projectInstance.get.mockResolvedValueOnce({ data: conversation });
    await expect(
      getSpaceConversation(client, { spaceId: "s1", userId: "u1" }),
    ).resolves.toEqual(conversation);
  });

  it("moderateSpaceChatMessage returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "moderated", moderationStatus: "removed" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      moderateSpaceChatMessage(client, {
        spaceId: "s1",
        messageId: "msg1",
        moderationStatus: "removed",
      }),
    ).resolves.toEqual(result);
  });

  it("handleSpaceChatReport returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "handled", code: "ok" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      handleSpaceChatReport(client, {
        spaceId: "s1",
        reportId: "r1",
        actions: ["dismiss"],
      }),
    ).resolves.toEqual(result);
  });

  it("createRule returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const rule = { id: "r1", title: "Be nice" };
    projectInstance.post.mockResolvedValueOnce({ data: rule });
    await expect(
      createRule(client, { spaceId: "s1", title: "Be nice" }),
    ).resolves.toEqual(rule);
  });

  it("updateRule returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const rule = { id: "r1", title: "Updated" };
    projectInstance.patch.mockResolvedValueOnce({ data: rule });
    await expect(
      updateRule(client, { spaceId: "s1", ruleId: "r1", title: "Updated" }),
    ).resolves.toEqual(rule);
  });

  it("deleteRule returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { deleted: true };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(
      deleteRule(client, { spaceId: "s1", ruleId: "r1" }),
    ).resolves.toEqual(result);
  });

  it("fetchRule returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const rule = { id: "r1", title: "Be nice" };
    projectInstance.get.mockResolvedValueOnce({ data: rule });
    await expect(fetchRule(client, { spaceId: "s1", ruleId: "r1" })).resolves.toEqual(
      rule,
    );
  });

  it("fetchManyRules returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { rules: [{ id: "r1" }] };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchManyRules(client, { spaceId: "s1" })).resolves.toEqual(result);
  });

  it("reorderRules returns response.data as an array", async () => {
    const { client, projectInstance } = makeClient();
    const rules = [{ id: "r2" }, { id: "r1" }];
    projectInstance.patch.mockResolvedValueOnce({ data: rules });
    await expect(
      reorderRules(client, { spaceId: "s1", ruleIds: ["r2", "r1"] }),
    ).resolves.toEqual(rules);
  });
});
