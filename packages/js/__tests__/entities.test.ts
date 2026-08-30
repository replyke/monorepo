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
  isEntitySaved,
  publishDraft,
  removeReaction,
  updateEntity,
} from "../src/modules/entities";
import { makeClient } from "./helpers/client";

describe("js-sdk entities — request shaping", () => {
  it("createEntity posts the full body to /entities (no implicit actor)", async () => {
    const { client, projectInstance } = makeClient();
    const data = {
      title: "x",
      content: "hello world",
      keywords: ["a", "b"],
    };
    await createEntity(client, data);
    expect(projectInstance.post).toHaveBeenCalledWith("/entities", data);
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("userId");
  });

  it("createEntity passes excludeUserId through when set", async () => {
    const { client, projectInstance } = makeClient();
    await createEntity(client, { title: "x", excludeUserId: true });
    expect(projectInstance.post).toHaveBeenCalledWith("/entities", {
      title: "x",
      excludeUserId: true,
    });
  });

  it("fetchEntity strips entityId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntity(client, {
      entityId: "e1",
      include: "user",
      spaceReputationId: "none",
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/e1", {
      params: { include: "user", spaceReputationId: "none" },
    });
  });

  it("fetchEntityByForeignId gets /entities/by-foreign-id with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntityByForeignId(client, {
      foreignId: "f1",
      createIfNotFound: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/entities/by-foreign-id",
      {
        params: { foreignId: "f1", createIfNotFound: true },
      }
    );
  });

  it("fetchEntityByShortId gets /entities/by-short-id with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntityByShortId(client, { shortId: "s1", include: "space" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/entities/by-short-id",
      {
        params: { shortId: "s1", include: "space" },
      }
    );
  });

  it("fetchManyEntities gets /entities with the full query as params, including userId as a genuine author filter", async () => {
    const { client, projectInstance } = makeClient();
    const query = {
      sortBy: "hot" as const,
      page: 1,
      limit: 20,
      userId: "author-1",
    };
    await fetchManyEntities(client, query);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities", {
      params: query,
    });
  });

  it("fetchManyEntities forwards blockedFilter into the query params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyEntities(client, {
      blockedFilter: "include-outbound-blocked",
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).toEqual(
      expect.objectContaining({ blockedFilter: "include-outbound-blocked" })
    );
  });

  it("fetchManyEntities serializes keywordsFilters as a raw nested params object", async () => {
    const { client, projectInstance } = makeClient();
    const data = {
      keywordsFilters: { includes: ["nodejs"], doesNotInclude: ["spam"] },
      limit: 10,
    };
    await fetchManyEntities(client, data);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities", {
      params: data,
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params.keywordsFilters).toEqual({
      includes: ["nodejs"],
      doesNotInclude: ["spam"],
    });
  });

  it("fetchManyEntities serializes metadataFilters as a raw nested params object", async () => {
    const { client, projectInstance } = makeClient();
    const data = {
      metadataFilters: {
        exists: ["category"],
        includesAny: [{ featured: true }],
      },
      sortBy: "top" as const,
    };
    await fetchManyEntities(client, data);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities", {
      params: data,
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params.metadataFilters).toEqual({
      exists: ["category"],
      includesAny: [{ featured: true }],
    });
  });

  it("fetchManyEntities serializes locationFilters and titleFilters as raw nested params objects", async () => {
    const { client, projectInstance } = makeClient();
    const data = {
      locationFilters: { latitude: "40.0", longitude: "-73.0", radius: "10" },
      titleFilters: { hasTitle: "true" as const, includes: "hello" },
    };
    await fetchManyEntities(client, data);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities", {
      params: data,
    });
  });

  it("updateEntity strips entityId into the path and patches the rest (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await updateEntity(client, { entityId: "e1", title: "new" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/entities/e1", {
      title: "new",
    });
  });

  it("deleteEntity deletes /entities/:entityId with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await deleteEntity(client, { entityId: "e1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/entities/e1");
  });

  it("fetchDrafts gets /entities/drafts with the full data as params (no implicit actor)", async () => {
    const { client, projectInstance } = makeClient();
    const data = { page: 2, limit: 5, spaceId: "sp1" };
    await fetchDrafts(client, data);
    expect(projectInstance.get).toHaveBeenCalledWith("/entities/drafts", {
      params: data,
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("userId");
  });

  it("publishDraft patches the publish route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await publishDraft(client, { entityId: "e1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/entities/e1/publish"
    );
  });

  it("fetchTopComment gets the top-comment route with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchTopComment(client, { entityId: "e1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/entities/e1/top-comment"
    );
  });

  it("addReaction posts only reactionType to /entities/:entityId/reactions (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await addReaction(client, { entityId: "e1", reactionType: "love" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/entities/e1/reactions",
      { reactionType: "love" }
    );
  });

  it("removeReaction deletes /entities/:entityId/reactions with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await removeReaction(client, { entityId: "e1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/entities/e1/reactions"
    );
  });

  it("fetchReactions strips entityId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchReactions(client, {
      entityId: "e1",
      reactionType: "upvote",
      page: 1,
      limit: 10,
      sortDir: "asc",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/entities/e1/reactions",
      { params: { reactionType: "upvote", page: 1, limit: 10, sortDir: "asc" } }
    );
  });

  it("getUserReaction gets /entities/:entityId/reactions/me with no params (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await getUserReaction(client, { entityId: "e1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/entities/e1/reactions/me"
    );
  });

  it("isEntitySaved gets /entities/is-entity-saved with the full data as params (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await isEntitySaved(client, { entityId: "e1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/entities/is-entity-saved",
      { params: { entityId: "e1" } }
    );
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("userId");
  });
});

describe("js-sdk entities — response mapping", () => {
  it("createEntity returns the created Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", title: "x" };
    projectInstance.post.mockResolvedValueOnce({ data: entity });

    const result = await createEntity(client, { title: "x" });

    expect(result).toEqual(entity);
  });

  it("fetchEntity returns the Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", title: "hello" };
    projectInstance.get.mockResolvedValueOnce({ data: entity });

    const result = await fetchEntity(client, { entityId: "e1" });

    expect(result).toEqual(entity);
  });

  it("fetchEntityByForeignId returns the Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", foreignId: "f1" };
    projectInstance.get.mockResolvedValueOnce({ data: entity });

    const result = await fetchEntityByForeignId(client, { foreignId: "f1" });

    expect(result).toEqual(entity);
  });

  it("fetchEntityByShortId returns the Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", shortId: "s1" };
    projectInstance.get.mockResolvedValueOnce({ data: entity });

    const result = await fetchEntityByShortId(client, { shortId: "s1" });

    expect(result).toEqual(entity);
  });

  it("fetchManyEntities returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "e1" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchManyEntities(client, {});

    expect(result).toEqual(envelope);
  });

  it("updateEntity returns the updated Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", title: "new" };
    projectInstance.patch.mockResolvedValueOnce({ data: entity });

    const result = await updateEntity(client, { entityId: "e1", title: "new" });

    expect(result).toEqual(entity);
  });

  it("deleteEntity resolves to undefined (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });

    const result = await deleteEntity(client, { entityId: "e1" });

    expect(result).toBeUndefined();
  });

  it("fetchDrafts returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "e1", isDraft: true }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchDrafts(client, {});

    expect(result).toEqual(envelope);
  });

  it("publishDraft returns the published Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = { id: "e1", isDraft: false };
    projectInstance.patch.mockResolvedValueOnce({ data: entity });

    const result = await publishDraft(client, { entityId: "e1" });

    expect(result).toEqual(entity);
  });

  it("fetchTopComment returns the TopComment", async () => {
    const { client, projectInstance } = makeClient();
    const topComment = { id: "c1", content: "great post", upvotesCount: 3 };
    projectInstance.get.mockResolvedValueOnce({ data: topComment });

    const result = await fetchTopComment(client, { entityId: "e1" });

    expect(result).toEqual(topComment);
  });

  it("fetchTopComment returns null when there is no top comment", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: null });

    const result = await fetchTopComment(client, { entityId: "e1" });

    expect(result).toBeNull();
  });

  it("addReaction returns the full populated Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = {
      id: "e1",
      reactionCounts: { love: 1, upvote: 0 },
      userReaction: "love",
    };
    projectInstance.post.mockResolvedValueOnce({ data: entity });

    const result = await addReaction(client, {
      entityId: "e1",
      reactionType: "love",
    });

    expect(result).toEqual(entity);
  });

  it("removeReaction returns the full populated Entity", async () => {
    const { client, projectInstance } = makeClient();
    const entity = {
      id: "e1",
      reactionCounts: { love: 0, upvote: 0 },
      userReaction: null,
    };
    projectInstance.delete.mockResolvedValueOnce({ data: entity });

    const result = await removeReaction(client, { entityId: "e1" });

    expect(result).toEqual(entity);
  });

  it("fetchReactions returns the reactions envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "r1", reactionType: "upvote", userId: "u1" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchReactions(client, { entityId: "e1" });

    expect(result).toEqual(envelope);
  });

  it("getUserReaction returns the reactionType wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({
      data: { reactionType: "upvote" },
    });

    const result = await getUserReaction(client, { entityId: "e1" });

    expect(result).toEqual({ reactionType: "upvote" });
  });

  it("isEntitySaved returns the saved status with collections", async () => {
    const { client, projectInstance } = makeClient();
    const saved = {
      saved: true,
      collections: [{ id: "col1", name: "Favorites" }],
    };
    projectInstance.get.mockResolvedValueOnce({ data: saved });

    const result = await isEntitySaved(client, { entityId: "e1" });

    expect(result).toEqual(saved);
  });
});
