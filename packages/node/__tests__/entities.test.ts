import {
  addReaction,
  createEntity,
  deleteEntity,
  fetchDrafts,
  fetchEntity,
  fetchEntityByForeignId,
  fetchEntityByShortId,
  fetchManyEntities,
  fetchReactions,
  fetchTopComment,
  getUserReaction,
  incrementEntityViews,
  isEntitySaved,
  publishDraft,
  removeReaction,
  updateEntity,
} from "../src/modules/entities";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk entities — request shaping", () => {
  it("createEntity posts the full body to /entities", async () => {
    const { client, projectInstance } = makeClient();
    await createEntity(client, { title: "x", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/entities", {
      title: "x",
      userId: "u1",
    });
  });

  it("fetchEntity strips entityId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntity(client, { entityId: "e1", include: "user" });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/e1", {
      params: { include: "user" },
    });
  });

  it("fetchEntityByForeignId hits /entities/by-foreign-id with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntityByForeignId(client, { foreignId: "f1", createIfNotFound: true });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/by-foreign-id", {
      params: { foreignId: "f1", createIfNotFound: true },
    });
  });

  it("fetchEntityByShortId hits /entities/by-short-id with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntityByShortId(client, { shortId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/by-short-id", {
      params: { shortId: "s1" },
    });
  });

  it("fetchManyEntities passes keywordsFilters through as a raw params object", async () => {
    const { client, projectInstance } = makeClient();
    const data = { keywordsFilters: { includes: ["nodejs"] }, limit: 10 };
    await fetchManyEntities(client, data);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities", { params: data });
  });

  it("fetchManyEntities passes metadataFilters through as a raw params object", async () => {
    const { client, projectInstance } = makeClient();
    const data = { metadataFilters: { exists: ["category"] }, sortBy: "hot" as const };
    await fetchManyEntities(client, data);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities", { params: data });
  });

  it("updateEntity strips entityId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateEntity(client, { entityId: "e1", title: "new" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/entities/e1", {
      title: "new",
    });
  });

  it("incrementEntityViews sends count as a query param, not a body field", async () => {
    const { client, projectInstance } = makeClient();
    await incrementEntityViews(client, { entityId: "e1", count: 3 });
    // The server reads `count` from the query string; as a body field it was
    // ignored and every call incremented by the default of 1.
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/entities/e1/increment-views",
      undefined,
      { params: { count: 3 } },
    );
  });

  it("incrementEntityViews omits count when not supplied", async () => {
    const { client, projectInstance } = makeClient();
    await incrementEntityViews(client, { entityId: "e1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/entities/e1/increment-views",
      undefined,
      { params: {} },
    );
  });

  it("deleteEntity deletes /entities/:id", async () => {
    const { client, projectInstance } = makeClient();
    await deleteEntity(client, { entityId: "e1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/entities/e1");
  });

  it("fetchDrafts hits /entities/drafts with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchDrafts(client, { userId: "u1", page: 2 });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/drafts", {
      params: { userId: "u1", page: 2 },
    });
  });

  it("publishDraft patches the publish route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await publishDraft(client, { entityId: "e1" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/entities/e1/publish");
  });

  it("fetchTopComment hits the top-comment route", async () => {
    const { client, projectInstance } = makeClient();
    await fetchTopComment(client, { entityId: "e1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/e1/top-comment");
  });

  it("addReaction posts reactionType and userId to /entities/:id/reactions", async () => {
    const { client, projectInstance } = makeClient();
    await addReaction(client, { entityId: "e1", reactionType: "like", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/entities/e1/reactions", {
      reactionType: "like",
      userId: "u1",
    });
  });

  it("removeReaction sends userId via the data option", async () => {
    const { client, projectInstance } = makeClient();
    await removeReaction(client, { entityId: "e1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/entities/e1/reactions", {
      data: { userId: "u1" },
    });
  });

  it("fetchReactions strips entityId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchReactions(client, { entityId: "e1", reactionType: "like", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/e1/reactions", {
      params: { reactionType: "like", page: 1 },
    });
  });

  it("getUserReaction hits the /reactions/me route with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await getUserReaction(client, { entityId: "e1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/e1/reactions/me", {
      params: { userId: "u1" },
    });
  });

  it("isEntitySaved hits /entities/is-entity-saved with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await isEntitySaved(client, { entityId: "e1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/is-entity-saved", {
      params: { entityId: "e1", userId: "u1" },
    });
  });
});

describe("node-sdk entities — response mapping", () => {
  it("createEntity returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", title: "x" };
    projectInstance.post.mockResolvedValueOnce({ data: entity });
    await expect(createEntity(client, { title: "x" })).resolves.toEqual(entity);
  });

  it("fetchEntity returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1" };
    projectInstance.get.mockResolvedValueOnce({ data: entity });
    await expect(fetchEntity(client, { entityId: "e1" })).resolves.toEqual(entity);
  });

  it("fetchEntityByForeignId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1" };
    projectInstance.get.mockResolvedValueOnce({ data: entity });
    await expect(
      fetchEntityByForeignId(client, { foreignId: "f1" }),
    ).resolves.toEqual(entity);
  });

  it("fetchEntityByShortId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1" };
    projectInstance.get.mockResolvedValueOnce({ data: entity });
    await expect(
      fetchEntityByShortId(client, { shortId: "s1" }),
    ).resolves.toEqual(entity);
  });

  it("fetchManyEntities returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "e1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchManyEntities(client, {})).resolves.toEqual(envelope);
  });

  it("updateEntity returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", title: "new" };
    projectInstance.patch.mockResolvedValueOnce({ data: entity });
    await expect(
      updateEntity(client, { entityId: "e1", title: "new" }),
    ).resolves.toEqual(entity);
  });

  it("incrementEntityViews returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", views: 4 };
    projectInstance.patch.mockResolvedValueOnce({ data: entity });
    await expect(
      incrementEntityViews(client, { entityId: "e1" }),
    ).resolves.toEqual(entity);
  });

  it("deleteEntity resolves with response.data (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });
    await expect(deleteEntity(client, { entityId: "e1" })).resolves.toBeUndefined();
  });

  it("fetchDrafts returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "e1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchDrafts(client, { userId: "u1" })).resolves.toEqual(envelope);
  });

  it("publishDraft returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", isDraft: false };
    projectInstance.patch.mockResolvedValueOnce({ data: entity });
    await expect(publishDraft(client, { entityId: "e1" })).resolves.toEqual(entity);
  });

  it("fetchTopComment returns response.data, including null", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: null });
    await expect(fetchTopComment(client, { entityId: "e1" })).resolves.toBeNull();
  });

  it("addReaction returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const reaction = { id: "r1", reactionType: "like" };
    projectInstance.post.mockResolvedValueOnce({ data: reaction });
    await expect(
      addReaction(client, { entityId: "e1", reactionType: "like", userId: "u1" }),
    ).resolves.toEqual(reaction);
  });

  it("removeReaction resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      removeReaction(client, { entityId: "e1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("fetchReactions returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "r1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchReactions(client, { entityId: "e1" })).resolves.toEqual(envelope);
  });

  it("getUserReaction returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { reactionType: "like" as const };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      getUserReaction(client, { entityId: "e1", userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("isEntitySaved returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { isSaved: true };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      isEntitySaved(client, { entityId: "e1", userId: "u1" }),
    ).resolves.toEqual(result);
  });
});
