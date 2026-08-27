import {
  addHost,
  addInvite,
  cancelEvent,
  createEvent,
  deleteEvent,
  fetchEvent,
  fetchEventRsvps,
  fetchInvitees,
  fetchManyEvents,
  removeHost,
  removeInvite,
  setRsvp,
  updateEvent,
  withdrawRsvp,
} from "../src/modules/events";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk events — request shaping", () => {
  it("createEvent posts the full body to /events", async () => {
    const { client, projectInstance } = makeClient();
    await createEvent(client, {
      title: "Launch party",
      startTime: "2026-07-01T18:00:00Z",
      type: "physical",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/events", {
      title: "Launch party",
      startTime: "2026-07-01T18:00:00Z",
      type: "physical",
    });
  });

  it("fetchEvent strips eventId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEvent(client, { eventId: "ev1", include: "user,space" });
    expect(projectInstance.get).toHaveBeenCalledWith("/events/ev1", {
      params: { include: "user,space" },
    });
  });

  it("fetchManyEvents hits /events with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyEvents(client, { timeWindow: "upcoming", spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/events", {
      params: { timeWindow: "upcoming", spaceId: "s1" },
    });
  });

  it("fetchManyEvents defaults to an empty params object when called with no args", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyEvents(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/events", { params: {} });
  });

  it("updateEvent strips eventId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateEvent(client, { eventId: "ev1", title: "New title" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/events/ev1", {
      title: "New title",
    });
  });

  it("cancelEvent posts the cancel route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await cancelEvent(client, { eventId: "ev1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/events/ev1/cancel");
  });

  it("deleteEvent deletes /events/:id", async () => {
    const { client, projectInstance } = makeClient();
    await deleteEvent(client, { eventId: "ev1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/events/ev1");
  });

  it("setRsvp strips eventId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await setRsvp(client, { eventId: "ev1", status: "going", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/events/ev1/rsvp", {
      status: "going",
      userId: "u1",
    });
  });

  it("withdrawRsvp sends the rest of the body via the data option", async () => {
    const { client, projectInstance } = makeClient();
    await withdrawRsvp(client, { eventId: "ev1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/events/ev1/rsvp", {
      data: { userId: "u1" },
    });
  });

  it("addHost posts userId to /events/:id/hosts", async () => {
    const { client, projectInstance } = makeClient();
    await addHost(client, { eventId: "ev1", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/events/ev1/hosts", {
      userId: "u1",
    });
  });

  it("removeHost sends userId via the data option", async () => {
    const { client, projectInstance } = makeClient();
    await removeHost(client, { eventId: "ev1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/events/ev1/hosts", {
      data: { userId: "u1" },
    });
  });

  it("addInvite posts userId to /events/:id/invites", async () => {
    const { client, projectInstance } = makeClient();
    await addInvite(client, { eventId: "ev1", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/events/ev1/invites", {
      userId: "u1",
    });
  });

  it("removeInvite sends userId via the data option", async () => {
    const { client, projectInstance } = makeClient();
    await removeInvite(client, { eventId: "ev1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/events/ev1/invites", {
      data: { userId: "u1" },
    });
  });

  it("fetchInvitees strips eventId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchInvitees(client, { eventId: "ev1", page: 2 });
    expect(projectInstance.get).toHaveBeenCalledWith("/events/ev1/invites", {
      params: { page: 2 },
    });
  });

  it("fetchEventRsvps strips eventId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEventRsvps(client, { eventId: "ev1", status: "going,maybe" });
    expect(projectInstance.get).toHaveBeenCalledWith("/events/ev1/rsvps", {
      params: { status: "going,maybe" },
    });
  });
});

describe("node-sdk events — response mapping", () => {
  it("createEvent returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", title: "Launch party" };
    projectInstance.post.mockResolvedValueOnce({ data: event });
    await expect(
      createEvent(client, { title: "Launch party", startTime: "2026-07-01T18:00:00Z", type: "physical" }),
    ).resolves.toEqual(event);
  });

  it("fetchEvent returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1" };
    projectInstance.get.mockResolvedValueOnce({ data: event });
    await expect(fetchEvent(client, { eventId: "ev1" })).resolves.toEqual(event);
  });

  it("fetchManyEvents returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "ev1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchManyEvents(client)).resolves.toEqual(envelope);
  });

  it("updateEvent returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", title: "New title" };
    projectInstance.patch.mockResolvedValueOnce({ data: event });
    await expect(
      updateEvent(client, { eventId: "ev1", title: "New title" }),
    ).resolves.toEqual(event);
  });

  it("cancelEvent returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", status: "cancelled" };
    projectInstance.post.mockResolvedValueOnce({ data: event });
    await expect(cancelEvent(client, { eventId: "ev1" })).resolves.toEqual(event);
  });

  it("deleteEvent resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(deleteEvent(client, { eventId: "ev1" })).resolves.toBeUndefined();
  });

  it("setRsvp returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", rsvpCounts: { going: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: event });
    await expect(
      setRsvp(client, { eventId: "ev1", status: "going" }),
    ).resolves.toEqual(event);
  });

  it("withdrawRsvp returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", rsvpCounts: { going: 0 } };
    projectInstance.delete.mockResolvedValueOnce({ data: event });
    await expect(withdrawRsvp(client, { eventId: "ev1" })).resolves.toEqual(event);
  });

  it("addHost returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", hostIds: ["u1"] };
    projectInstance.post.mockResolvedValueOnce({ data: event });
    await expect(
      addHost(client, { eventId: "ev1", userId: "u1" }),
    ).resolves.toEqual(event);
  });

  it("removeHost returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1", hostIds: [] };
    projectInstance.delete.mockResolvedValueOnce({ data: event });
    await expect(
      removeHost(client, { eventId: "ev1", userId: "u1" }),
    ).resolves.toEqual(event);
  });

  it("addInvite returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1" };
    projectInstance.post.mockResolvedValueOnce({ data: event });
    await expect(
      addInvite(client, { eventId: "ev1", userId: "u1" }),
    ).resolves.toEqual(event);
  });

  it("removeInvite returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const event = { id: "ev1" };
    projectInstance.delete.mockResolvedValueOnce({ data: event });
    await expect(
      removeInvite(client, { eventId: "ev1", userId: "u1" }),
    ).resolves.toEqual(event);
  });

  it("fetchInvitees returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ userId: "u1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchInvitees(client, { eventId: "ev1" }),
    ).resolves.toEqual(envelope);
  });

  it("fetchEventRsvps returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ userId: "u1", status: "going" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchEventRsvps(client, { eventId: "ev1" }),
    ).resolves.toEqual(envelope);
  });
});
