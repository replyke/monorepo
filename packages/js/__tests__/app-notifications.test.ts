import {
  countUnreadNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../src/modules/app-notifications";
import { makeClient } from "./helpers/client";

describe("js-sdk appNotifications — request shaping", () => {
  it("fetchNotifications hits /app-notifications with the query as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchNotifications(client, { page: 1, limit: 20 });
    expect(projectInstance.get).toHaveBeenCalledWith("/app-notifications", {
      params: { page: 1, limit: 20 },
    });
  });

  it("fetchNotifications passes undefined params when called with no args", async () => {
    const { client, projectInstance } = makeClient();
    await fetchNotifications(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/app-notifications", {
      params: undefined,
    });
  });

  it("countUnreadNotifications hits /app-notifications/count with no params (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await countUnreadNotifications(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/app-notifications/count");
  });

  it("markNotificationAsRead patches the mark-as-read route, no body (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await markNotificationAsRead(client, { notificationId: "n1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/app-notifications/n1/mark-as-read"
    );
  });

  it("markAllNotificationsAsRead patches the mark-all-as-read route, no body (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await markAllNotificationsAsRead(client);
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/app-notifications/mark-all-as-read"
    );
  });
});

describe("js-sdk appNotifications — response mapping", () => {
  it("fetchNotifications returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "n1", type: "system", isRead: false }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchNotifications(client, { page: 1 });

    expect(result).toEqual(envelope);
  });

  it("countUnreadNotifications returns response.data as a raw number", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: 4 });

    const result = await countUnreadNotifications(client);

    expect(result).toBe(4);
  });

  it("markNotificationAsRead resolves to undefined", async () => {
    const { client } = makeClient();

    const result = await markNotificationAsRead(client, {
      notificationId: "n1",
    });

    expect(result).toBeUndefined();
  });

  it("markAllNotificationsAsRead returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { markedAsRead: 7 };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await markAllNotificationsAsRead(client);

    expect(response).toEqual(result);
  });
});
