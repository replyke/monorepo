import { createReport, fetchModeratedReports } from "../src/modules/reports";
import { makeClient } from "./helpers/client";

describe("js-sdk reports — request shaping", () => {
  it("createReport posts the body to /reports (reporter derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await createReport(client, {
      targetType: "entity",
      targetId: "e1",
      reason: "spam",
      details: "posted the same link repeatedly",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/reports", {
      targetType: "entity",
      targetId: "e1",
      reason: "spam",
      details: "posted the same link repeatedly",
    });
  });

  it("fetchModeratedReports hits /reports/moderated with the query as params (moderator derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchModeratedReports(client, {
      spaceId: "s1",
      status: "pending",
      sortBy: "new",
      page: 1,
      limit: 20,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/reports/moderated", {
      params: {
        spaceId: "s1",
        status: "pending",
        sortBy: "new",
        page: 1,
        limit: 20,
      },
    });
  });
});

describe("js-sdk reports — response mapping", () => {
  it("createReport returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Report created", code: "report/created" };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    const response = await createReport(client, {
      targetType: "comment",
      targetId: "c1",
      reason: "harassment",
    });

    expect(response).toEqual(result);
  });

  it("fetchModeratedReports returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        {
          id: "rep1",
          projectId: "proj1",
          spaceId: "s1",
          targetId: "e1",
          targetType: "entity",
          status: "pending",
          reporterCount: 2,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchModeratedReports(client, { spaceId: "s1" });

    expect(result).toEqual(envelope);
  });
});
