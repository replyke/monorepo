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
import { makeClient } from "./helpers/client";

describe("js-sdk spaces (moderation/reports) — request shaping", () => {
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
      { entityId: "e1", actions: ["remove-entity", "ban-user"] }
    );
  });

  it("handleEntityReport also accepts the dismiss action alone", async () => {
    const { client, projectInstance } = makeClient();
    await handleEntityReport(client, {
      spaceId: "s1",
      reportId: "r1",
      entityId: "e1",
      actions: ["dismiss"],
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/reports/entity/r1",
      { entityId: "e1", actions: ["dismiss"] }
    );
  });

  it("handleEntityReport KEEPS userId as the ban target when actions include ban-user (Rule A exception)", async () => {
    const { client, projectInstance } = makeClient();
    await handleEntityReport(client, {
      spaceId: "s1",
      reportId: "r1",
      entityId: "e1",
      actions: ["ban-user"],
      userId: "target-user-1",
    });
    const [, body] = projectInstance.patch.mock.calls[0];
    // Contrast with the dropped-actor pattern elsewhere in this module
    // (joinSpace/leaveSpace/checkMyMembership): here userId IS sent, because
    // it identifies the report's offending user (the ban target), not the
    // acting moderator.
    expect(body).toHaveProperty("userId", "target-user-1");
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/reports/entity/r1",
      {
        entityId: "e1",
        actions: ["ban-user"],
        userId: "target-user-1",
      }
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
      { commentId: "c1", actions: ["remove-comment", "dismiss"] }
    );
  });

  it("handleCommentReport KEEPS userId as the ban target when actions include ban-user (Rule A exception)", async () => {
    const { client, projectInstance } = makeClient();
    await handleCommentReport(client, {
      spaceId: "s1",
      reportId: "r1",
      commentId: "c1",
      actions: ["ban-user"],
      userId: "target-user-2",
    });
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toHaveProperty("userId", "target-user-2");
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/reports/comment/r1",
      {
        commentId: "c1",
        actions: ["ban-user"],
        userId: "target-user-2",
      }
    );
  });

  it("moderateSpaceEntity strips spaceId/entityId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceEntity(client, {
      spaceId: "s1",
      entityId: "e1",
      action: "remove",
      reason: "spam",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/entities/e1/moderation",
      { action: "remove", reason: "spam" }
    );
  });

  it("moderateSpaceComment strips spaceId/commentId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceComment(client, {
      spaceId: "s1",
      commentId: "c1",
      action: "approve",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/comments/c1/moderation",
      { action: "approve" }
    );
  });

  it("getSpaceConversation hits the conversation route with no params (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await getSpaceConversation(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/spaces/s1/conversation"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("moderateSpaceChatMessage strips spaceId/messageId into the path and patches the rest, no actingUserId field", async () => {
    const { client, projectInstance } = makeClient();
    await moderateSpaceChatMessage(client, {
      spaceId: "s1",
      messageId: "msg1",
      moderationStatus: "removed",
      moderationReason: "abuse",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/chat/messages/msg1/moderation",
      { moderationStatus: "removed", moderationReason: "abuse" }
    );
  });

  it("handleSpaceChatReport strips spaceId/reportId into the path and patches the rest, covering multiple action types", async () => {
    const { client, projectInstance } = makeClient();
    await handleSpaceChatReport(client, {
      spaceId: "s1",
      reportId: "r1",
      actions: ["remove-message", "dismiss"],
      messageId: "msg1",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/chat/reports/r1",
      { actions: ["remove-message", "dismiss"], messageId: "msg1" }
    );
  });

  it("handleSpaceChatReport KEEPS userId as the ban target when actions include ban-user (Rule A exception)", async () => {
    const { client, projectInstance } = makeClient();
    await handleSpaceChatReport(client, {
      spaceId: "s1",
      reportId: "r1",
      actions: ["ban-user"],
      userId: "target-user-3",
    });
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toHaveProperty("userId", "target-user-3");
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/chat/reports/r1",
      { actions: ["ban-user"], userId: "target-user-3" }
    );
  });

  it("createRule strips spaceId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await createRule(client, {
      spaceId: "s1",
      title: "Be nice",
      description: "Don't be a jerk",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces/s1/rules", {
      title: "Be nice",
      description: "Don't be a jerk",
    });
  });

  it("fetchRule hits /spaces/:spaceId/rules/:ruleId with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchRule(client, { spaceId: "s1", ruleId: "r1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/rules/r1");
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchManyRules hits /spaces/:spaceId/rules with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyRules(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/rules");
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("updateRule strips spaceId/ruleId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateRule(client, {
      spaceId: "s1",
      ruleId: "r1",
      title: "Updated title",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/rules/r1",
      { title: "Updated title" }
    );
  });

  it("deleteRule deletes /spaces/:spaceId/rules/:ruleId", async () => {
    const { client, projectInstance } = makeClient();
    await deleteRule(client, { spaceId: "s1", ruleId: "r1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/spaces/s1/rules/r1"
    );
  });

  it("reorderRules patches the reorder route with ruleIds in the body", async () => {
    const { client, projectInstance } = makeClient();
    await reorderRules(client, { spaceId: "s1", ruleIds: ["r2", "r1"] });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/rules/reorder",
      { ruleIds: ["r2", "r1"] }
    );
  });
});

describe("js-sdk spaces (moderation/reports) — response mapping", () => {
  it("handleEntityReport returns the HandleReportResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Report handled", code: "ok" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await handleEntityReport(client, {
      spaceId: "s1",
      reportId: "r1",
      entityId: "e1",
      actions: ["dismiss"],
    });

    expect(response).toEqual(result);
  });

  it("handleCommentReport returns the HandleReportResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Report handled", code: "ok" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await handleCommentReport(client, {
      spaceId: "s1",
      reportId: "r1",
      commentId: "c1",
      actions: ["dismiss"],
    });

    expect(response).toEqual(result);
  });

  it("moderateSpaceEntity returns the ModerationResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Entity moderated", moderationStatus: "removed" as const };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await moderateSpaceEntity(client, {
      spaceId: "s1",
      entityId: "e1",
      action: "remove",
    });

    expect(response).toEqual(result);
  });

  it("moderateSpaceComment returns the ModerationResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Comment moderated", moderationStatus: "approved" as const };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await moderateSpaceComment(client, {
      spaceId: "s1",
      commentId: "c1",
      action: "approve",
    });

    expect(response).toEqual(result);
  });

  it("getSpaceConversation returns the Conversation", async () => {
    const { client, projectInstance } = makeClient();
    const conversation = { id: "conv1", spaceId: "s1" };
    projectInstance.get.mockResolvedValueOnce({ data: conversation });

    const response = await getSpaceConversation(client, { spaceId: "s1" });

    expect(response).toEqual(conversation);
  });

  it("moderateSpaceChatMessage returns the ModerateSpaceChatMessageResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Message moderated", moderationStatus: "removed" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await moderateSpaceChatMessage(client, {
      spaceId: "s1",
      messageId: "msg1",
      moderationStatus: "removed",
    });

    expect(response).toEqual(result);
  });

  it("handleSpaceChatReport returns the HandleSpaceChatReportResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Report handled", code: "ok" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await handleSpaceChatReport(client, {
      spaceId: "s1",
      reportId: "r1",
      actions: ["dismiss"],
    });

    expect(response).toEqual(result);
  });

  it("createRule returns the created Rule", async () => {
    const { client, projectInstance } = makeClient();
    const rule = { id: "r1", spaceId: "s1", title: "Be nice", description: null, order: 1, lastApprovedBy: null, createdAt: "now", updatedAt: "now" };
    projectInstance.post.mockResolvedValueOnce({ data: rule });

    const response = await createRule(client, { spaceId: "s1", title: "Be nice" });

    expect(response).toEqual(rule);
  });

  it("fetchRule returns the Rule", async () => {
    const { client, projectInstance } = makeClient();
    const rule = { id: "r1", title: "Be nice" };
    projectInstance.get.mockResolvedValueOnce({ data: rule });

    const response = await fetchRule(client, { spaceId: "s1", ruleId: "r1" });

    expect(response).toEqual(rule);
  });

  it("fetchManyRules returns the FetchManyRulesResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { data: [{ id: "r1" }], count: 1 };
    projectInstance.get.mockResolvedValueOnce({ data: result });

    const response = await fetchManyRules(client, { spaceId: "s1" });

    expect(response).toEqual(result);
  });

  it("updateRule returns the updated Rule", async () => {
    const { client, projectInstance } = makeClient();
    const rule = { id: "r1", title: "Updated title" };
    projectInstance.patch.mockResolvedValueOnce({ data: rule });

    const response = await updateRule(client, {
      spaceId: "s1",
      ruleId: "r1",
      title: "Updated title",
    });

    expect(response).toEqual(rule);
  });

  it("deleteRule returns the DeleteRuleResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Rule deleted",
      deletedRule: { id: "r1", title: "Be nice" },
    };
    projectInstance.delete.mockResolvedValueOnce({ data: result });

    const response = await deleteRule(client, { spaceId: "s1", ruleId: "r1" });

    expect(response).toEqual(result);
  });

  it("reorderRules returns the reordered Rule array", async () => {
    const { client, projectInstance } = makeClient();
    const rules = [{ id: "r2" }, { id: "r1" }];
    projectInstance.patch.mockResolvedValueOnce({ data: rules });

    const response = await reorderRules(client, {
      spaceId: "s1",
      ruleIds: ["r2", "r1"],
    });

    expect(response).toEqual(rules);
  });
});
