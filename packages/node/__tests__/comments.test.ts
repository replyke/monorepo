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
import { makeClient } from "./helpers/mockClient";

describe("node-sdk comments — request shaping", () => {
  it("createComment posts the full body to /comments", async () => {
    const { client, projectInstance } = makeClient();
    await createComment(client, { userId: "u1", entityId: "e1", content: "hi" });
    expect(projectInstance.post).toHaveBeenCalledWith("/comments", {
      userId: "u1",
      entityId: "e1",
      content: "hi",
    });
  });

  it("fetchComment strips commentId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchComment(client, { commentId: "c1", include: "user" });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments/c1", {
      params: { include: "user" },
    });
  });

  it("fetchCommentByForeignId hits /comments/by-foreign-id with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchCommentByForeignId(client, { foreignId: "f1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments/by-foreign-id", {
      params: { foreignId: "f1" },
    });
  });

  it("updateComment strips commentId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateComment(client, { commentId: "c1", content: "edited" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/comments/c1", {
      content: "edited",
    });
  });

  it("updateComment forwards metadata, with or without content", async () => {
    const { client, projectInstance } = makeClient();

    await updateComment(client, {
      commentId: "c1",
      content: "edited",
      metadata: { revision: 2 },
    });
    expect(projectInstance.patch).toHaveBeenCalledWith("/comments/c1", {
      content: "edited",
      metadata: { revision: 2 },
    });

    // Metadata-only edits are valid server-side; content must not be injected.
    await updateComment(client, { commentId: "c1", metadata: { pinned: true } });
    expect(projectInstance.patch).toHaveBeenLastCalledWith("/comments/c1", {
      metadata: { pinned: true },
    });
  });

  it("deleteComment deletes /comments/:id", async () => {
    const { client, projectInstance } = makeClient();
    await deleteComment(client, { commentId: "c1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/comments/c1");
  });

  it("fetchManyComments hits /comments with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyComments(client, { entityId: "e1", sortBy: "top" });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments", {
      params: { entityId: "e1", sortBy: "top" },
    });
  });

  it("addReaction posts reactionType and userId to /comments/:id/reactions", async () => {
    const { client, projectInstance } = makeClient();
    await addReaction(client, { commentId: "c1", reactionType: "like", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/comments/c1/reactions", {
      reactionType: "like",
      userId: "u1",
    });
  });

  it("removeReaction sends userId via the data option", async () => {
    const { client, projectInstance } = makeClient();
    await removeReaction(client, { commentId: "c1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/comments/c1/reactions", {
      data: { userId: "u1" },
    });
  });

  it("fetchReactions strips commentId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchReactions(client, { commentId: "c1", reactionType: "like" });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments/c1/reactions", {
      params: { reactionType: "like" },
    });
  });

  it("getUserReaction hits the /reactions/me route with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await getUserReaction(client, { commentId: "c1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/comments/c1/reactions/me", {
      params: { userId: "u1" },
    });
  });
});

describe("node-sdk comments — response mapping", () => {
  it("createComment returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1", content: "hi" };
    projectInstance.post.mockResolvedValueOnce({ data: comment });
    await expect(
      createComment(client, { userId: "u1", entityId: "e1" }),
    ).resolves.toEqual(comment);
  });

  it("fetchComment returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1" };
    projectInstance.get.mockResolvedValueOnce({ data: comment });
    await expect(fetchComment(client, { commentId: "c1" })).resolves.toEqual(comment);
  });

  it("fetchCommentByForeignId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1" };
    projectInstance.get.mockResolvedValueOnce({ data: comment });
    await expect(
      fetchCommentByForeignId(client, { foreignId: "f1" }),
    ).resolves.toEqual(comment);
  });

  it("updateComment returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const comment = { id: "c1", content: "edited" };
    projectInstance.patch.mockResolvedValueOnce({ data: comment });
    await expect(
      updateComment(client, { commentId: "c1", content: "edited" }),
    ).resolves.toEqual(comment);
  });

  it("deleteComment resolves with response.data (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });
    await expect(deleteComment(client, { commentId: "c1" })).resolves.toBeUndefined();
  });

  it("fetchManyComments returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "c1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchManyComments(client, {})).resolves.toEqual(envelope);
  });

  it("addReaction returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const reaction = { id: "r1", reactionType: "like" };
    projectInstance.post.mockResolvedValueOnce({ data: reaction });
    await expect(
      addReaction(client, { commentId: "c1", reactionType: "like", userId: "u1" }),
    ).resolves.toEqual(reaction);
  });

  it("removeReaction resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      removeReaction(client, { commentId: "c1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("fetchReactions returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "r1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchReactions(client, { commentId: "c1" })).resolves.toEqual(envelope);
  });

  it("getUserReaction returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { reactionType: "like" as const };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      getUserReaction(client, { commentId: "c1", userId: "u1" }),
    ).resolves.toEqual(result);
  });
});
