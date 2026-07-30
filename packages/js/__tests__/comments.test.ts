import {
  addReaction,
  createComment,
  deleteComment,
  fetchComment,
  fetchCommentByForeignId,
  fetchManyComments,
  fetchReactions,
  getUserReaction,
  removeReaction,
  updateComment,
} from "../src/modules/comments";
import { makeClient } from "./helpers/client";

describe("js-sdk comments — request shaping", () => {
  it("createComment posts the full body to /comments", async () => {
    const { client, projectInstance } = makeClient();
    const data = {
      entityId: "e1",
      content: "hello",
      parentId: null,
      mentions: [],
    };
    await createComment(client, data);
    expect(projectInstance.post).toHaveBeenCalledWith("/comments", data);
  });

  it("fetchComment gets /comments/:commentId with the rest as params (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchComment(client, {
      commentId: "c1",
      include: "user",
      spaceReputationId: "none",
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments/c1", {
      params: { include: "user", spaceReputationId: "none" },
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("userId");
  });

  it("fetchCommentByForeignId gets /comments/by-foreign-id with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchCommentByForeignId(client, {
      foreignId: "f1",
      include: "entity",
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments/by-foreign-id", {
      params: { foreignId: "f1", include: "entity" },
    });
  });

  it("updateComment patches /comments/:commentId with the rest of the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateComment(client, { commentId: "c1", content: "edited" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/comments/c1", {
      content: "edited",
    });
  });

  it("deleteComment deletes /comments/:commentId with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await deleteComment(client, { commentId: "c1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/comments/c1");
  });

  it("fetchManyComments gets /comments with the full query as params (no implicit actor)", async () => {
    const { client, projectInstance } = makeClient();
    const query = {
      entityId: "e1",
      parentId: "c0",
      page: 1,
      limit: 20,
      sortBy: "top" as const,
    };
    await fetchManyComments(client, query);
    expect(projectInstance.get).toHaveBeenCalledWith("/comments", {
      params: query,
    });
  });

  it("fetchManyComments forwards blockedFilter into the query params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyComments(client, {
      entityId: "e1",
      blockedFilter: "include-outbound-blocked",
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).toEqual(
      expect.objectContaining({ blockedFilter: "include-outbound-blocked" })
    );
  });

  it("addReaction posts only reactionType to /comments/:commentId/reactions (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await addReaction(client, { commentId: "c1", reactionType: "upvote" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/comments/c1/reactions",
      { reactionType: "upvote" }
    );
  });

  it("removeReaction deletes /comments/:commentId/reactions with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await removeReaction(client, { commentId: "c1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/comments/c1/reactions"
    );
  });

  it("fetchReactions gets /comments/:commentId/reactions with the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchReactions(client, {
      commentId: "c1",
      reactionType: "love",
      page: 2,
      limit: 10,
      sortDir: "desc",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/comments/c1/reactions",
      { params: { reactionType: "love", page: 2, limit: 10, sortDir: "desc" } }
    );
  });

  it("getUserReaction gets /comments/:commentId/reactions/me with no params (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await getUserReaction(client, { commentId: "c1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/comments/c1/reactions/me"
    );
  });
});

describe("js-sdk comments — response mapping", () => {
  it("createComment returns the created Comment", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1", content: "hello" };
    projectInstance.post.mockResolvedValueOnce({ data: comment });

    const result = await createComment(client, {
      entityId: "e1",
      content: "hello",
    });

    expect(result).toEqual(comment);
  });

  it("fetchComment returns the Comment", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1", content: "hi" };
    projectInstance.get.mockResolvedValueOnce({ data: comment });

    const result = await fetchComment(client, { commentId: "c1" });

    expect(result).toEqual(comment);
  });

  it("fetchCommentByForeignId returns the Comment", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1", foreignId: "f1" };
    projectInstance.get.mockResolvedValueOnce({ data: comment });

    const result = await fetchCommentByForeignId(client, { foreignId: "f1" });

    expect(result).toEqual(comment);
  });

  it("updateComment returns the updated Comment", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1", content: "edited" };
    projectInstance.patch.mockResolvedValueOnce({ data: comment });

    const result = await updateComment(client, {
      commentId: "c1",
      content: "edited",
    });

    expect(result).toEqual(comment);
  });

  it("deleteComment resolves to undefined (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });

    const result = await deleteComment(client, { commentId: "c1" });

    expect(result).toBeUndefined();
  });

  it("fetchManyComments returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "c1", content: "x" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchManyComments(client, { entityId: "e1" });

    expect(result).toEqual(envelope);
  });

  it("addReaction returns the full populated Comment", async () => {
    const { client, projectInstance } = makeClient();
    const comment = {
      id: "c1",
      reactionCounts: { upvote: 1, downvote: 0 },
      userReaction: "upvote",
    };
    projectInstance.post.mockResolvedValueOnce({ data: comment });

    const result = await addReaction(client, {
      commentId: "c1",
      reactionType: "upvote",
    });

    expect(result).toEqual(comment);
  });

  it("removeReaction returns the full populated Comment", async () => {
    const { client, projectInstance } = makeClient();
    const comment = {
      id: "c1",
      reactionCounts: { upvote: 0, downvote: 0 },
      userReaction: null,
    };
    projectInstance.delete.mockResolvedValueOnce({ data: comment });

    const result = await removeReaction(client, { commentId: "c1" });

    expect(result).toEqual(comment);
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

    const result = await fetchReactions(client, { commentId: "c1" });

    expect(result).toEqual(envelope);
  });

  it("getUserReaction returns the reactionType wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({
      data: { reactionType: "love" },
    });

    const result = await getUserReaction(client, { commentId: "c1" });

    expect(result).toEqual({ reactionType: "love" });
  });
});
