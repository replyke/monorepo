import {
  countUnreadNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../src/modules/app-notifications";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk appNotifications — request shaping", () => {
  it("fetchNotifications hits /app-notifications with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchNotifications(client, { userId: "u1", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/app-notifications", {
      params: { userId: "u1", page: 1 },
    });
  });

  it("countUnreadNotifications hits /app-notifications/count with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await countUnreadNotifications(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/app-notifications/count", {
      params: { userId: "u1" },
    });
  });

  it("markNotificationAsRead patches the mark-as-read route with userId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await markNotificationAsRead(client, { notificationId: "n1", userId: "u1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/app-notifications/n1/mark-as-read",
      { userId: "u1" },
    );
  });

  it("markAllNotificationsAsRead patches the mark-all-as-read route with userId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await markAllNotificationsAsRead(client, { userId: "u1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/app-notifications/mark-all-as-read",
      { userId: "u1" },
    );
  });
});

describe("node-sdk appNotifications — response mapping", () => {
  it("fetchNotifications returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "n1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchNotifications(client, { userId: "u1" })).resolves.toEqual(
      envelope,
    );
  });

  it("countUnreadNotifications returns response.data as a raw number", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: 3 });
    await expect(
      countUnreadNotifications(client, { userId: "u1" }),
    ).resolves.toBe(3);
  });

  it("markNotificationAsRead resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      markNotificationAsRead(client, { notificationId: "n1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("markAllNotificationsAsRead returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { markedAsRead: 5 };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      markAllNotificationsAsRead(client, { userId: "u1" }),
    ).resolves.toEqual(result);
  });
});
