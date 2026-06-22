import {
  acceptConnection,
  declineConnection,
  fetchConnections,
  fetchConnectionsCount,
  fetchReceivedPendingConnections,
  fetchSentPendingConnections,
  removeConnection,
} from "../src/modules/connections";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk connections — request shaping", () => {
  it("fetchConnections hits /connections with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnections(client, { userId: "u1", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/connections", {
      params: { userId: "u1", page: 1 },
    });
  });

  it("fetchConnectionsCount hits /connections/count with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionsCount(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/connections/count", {
      params: { userId: "u1" },
    });
  });

  it("fetchSentPendingConnections hits /connections/pending/sent with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSentPendingConnections(client, { userId: "u1", limit: 5 });
    expect(projectInstance.get).toHaveBeenCalledWith("/connections/pending/sent", {
      params: { userId: "u1", limit: 5 },
    });
  });

  it("fetchReceivedPendingConnections hits /connections/pending/received with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchReceivedPendingConnections(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/connections/pending/received",
      { params: { userId: "u1" } },
    );
  });

  it("acceptConnection patches /connections/:id/accept with userId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await acceptConnection(client, { connectionId: "conn1", userId: "u1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/connections/conn1/accept",
      { userId: "u1" },
    );
  });

  it("declineConnection patches /connections/:id/decline with userId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await declineConnection(client, { connectionId: "conn1", userId: "u1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/connections/conn1/decline",
      { userId: "u1" },
    );
  });

  it("removeConnection deletes /connections/:id with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await removeConnection(client, { connectionId: "conn1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/connections/conn1", {
      params: { userId: "u1" },
    });
  });
});

describe("node-sdk connections — response mapping", () => {
  it("fetchConnections returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "c1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchConnections(client, { userId: "u1" })).resolves.toEqual(envelope);
  });

  it("fetchConnectionsCount returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { count: 6 };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchConnectionsCount(client, { userId: "u1" })).resolves.toEqual(
      result,
    );
  });

  it("fetchSentPendingConnections returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "p1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchSentPendingConnections(client, { userId: "u1" }),
    ).resolves.toEqual(envelope);
  });

  it("fetchReceivedPendingConnections returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "p2" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchReceivedPendingConnections(client, { userId: "u1" }),
    ).resolves.toEqual(envelope);
  });

  it("acceptConnection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { id: "conn1", status: "accepted" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      acceptConnection(client, { connectionId: "conn1", userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("declineConnection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { id: "conn1", status: "declined" };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      declineConnection(client, { connectionId: "conn1", userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("removeConnection resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      removeConnection(client, { connectionId: "conn1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });
});
