import { fetchHostedApp } from "../src/modules/hosted-apps";
import { createReport, fetchModeratedReports } from "../src/modules/reports";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk hostedApps — request shaping", () => {
  it("fetchHostedApp hits the internal axios instance, not projectInstance", async () => {
    const { client, internalInstance, projectInstance } = makeClient();
    await fetchHostedApp(client, { appId: "app1" });
    expect(internalInstance.get).toHaveBeenCalledWith("/hosted-apps/app1");
    expect(projectInstance.get).not.toHaveBeenCalled();
  });
});

describe("node-sdk hostedApps — response mapping", () => {
  it("fetchHostedApp returns response.data", async () => {
    const { client, internalInstance } = makeClient();
    const app = { id: "app1", name: "My App" };
    internalInstance.get.mockResolvedValueOnce({ data: app });
    await expect(fetchHostedApp(client, { appId: "app1" })).resolves.toEqual(app);
  });
});

describe("node-sdk reports — request shaping", () => {
  it("createReport posts the full body to /reports", async () => {
    const { client, projectInstance } = makeClient();
    await createReport(client, {
      userId: "u1",
      targetType: "entity",
      targetId: "e1",
      reason: "spam",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/reports", {
      userId: "u1",
      targetType: "entity",
      targetId: "e1",
      reason: "spam",
    });
  });

  it("createReport posts a message report to /reports with no conversationId", async () => {
    const { client, projectInstance } = makeClient();
    await createReport(client, {
      userId: "u1",
      targetType: "message",
      targetId: "m1",
      reason: "harassment",
    });
    // Chat message reports go through the shared endpoint; the server resolves
    // the conversation from the message id.
    expect(projectInstance.post).toHaveBeenCalledWith("/reports", {
      userId: "u1",
      targetType: "message",
      targetId: "m1",
      reason: "harassment",
    });
  });

  it("fetchModeratedReports hits /reports/moderated with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchModeratedReports(client, { userId: "u1", status: "pending" });
    expect(projectInstance.get).toHaveBeenCalledWith("/reports/moderated", {
      params: { userId: "u1", status: "pending" },
    });
  });
});

describe("node-sdk reports — response mapping", () => {
  it("createReport returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { id: "rep1", status: "pending" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      createReport(client, {
        userId: "u1",
        targetType: "entity",
        targetId: "e1",
        reason: "spam",
      }),
    ).resolves.toEqual(result);
  });

  it("fetchModeratedReports returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "rep1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchModeratedReports(client, { userId: "u1" }),
    ).resolves.toEqual(envelope);
  });
});
