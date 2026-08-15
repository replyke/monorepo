import { describe, it, expect, afterEach, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../test-utils";
import useCommentSectionData from "./useCommentSectionData";
import { makeComment, makeEntity } from "./testHelpers";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Comment } from "../../interfaces/models/Comment";

afterEach(() => {
  resetAxiosMocks();
});

function emptyCommentsPage(): PaginatedResponse<Comment> {
  return {
    data: [],
    pagination: { page: 1, pageSize: 15, totalPages: 1, totalItems: 0, hasMore: false },
  };
}

describe("useCommentSectionData", () => {
  it("resolves an entity by entityId and loads its root comments", async () => {
    const entity = makeEntity({ id: "entity-1" });
    const comment = makeComment({ entityId: "entity-1" });

    // Resolving the entity triggers a cascading comments-list fetch in the same
    // effect-flush cycle, so both "get" responses must be queued up front —
    // there's no synchronization point between the two to mock them one at a time.
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ entityId: "entity-1" }),
      {
        beforeRender: ({ axiosPrivate }) => {
          axiosPrivate.mockResponse("get", entity); // entity fetch
          axiosPrivate.mockResponse("get", {
            data: [comment],
            pagination: { page: 1, pageSize: 15, totalPages: 1, totalItems: 1, hasMore: false },
          }); // comments fetch, cascades off the entity fetch resolving
        },
      },
    );

    await waitFor(() => expect(result.current.comments).toEqual([comment]));
    expect(result.current.entity).toEqual(entity);

    const [entityCall, commentsCall] = axiosPrivate.calls("get");
    expect(entityCall.url).toBe("/test-project/entities/entity-1");
    expect(commentsCall.url).toBe("/test-project/comments");
    expect(commentsCall.config?.params).toMatchObject({ entityId: "entity-1" });
  });

  it("creates a comment optimistically and replaces it with the server response", async () => {
    const entity = makeEntity({ id: "entity-1" });
    const user = makeAuthUser({ id: "user-1", username: "alice" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ entity }),
      {
        user,
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", emptyCommentsPage()),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const serverComment = makeComment({ id: "comment-1", content: "Hello there" });
    axiosPrivate.mockResponse("post", serverComment, 201);

    let returned: Comment | undefined;
    await act(async () => {
      returned = await result.current.createComment({ content: "Hello there" });
    });

    expect(returned).toEqual(serverComment);
    // Freshly-created comments are tracked as "new" (separate from the
    // initial-load `comments` list) until a refetch folds them in.
    expect(result.current.newComments).toEqual([serverComment]);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/comments");
    expect(call.body).toMatchObject({ entityId: "entity-1", content: "Hello there" });
  });

  it("rolls back the optimistic comment when the create request fails", async () => {
    const entity = makeEntity({ id: "entity-1" });
    const user = makeAuthUser({ id: "user-1", username: "alice" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ entity }),
      {
        user,
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", emptyCommentsPage()),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    let returned: Comment | undefined;
    await act(async () => {
      returned = await result.current.createComment({ content: "Hello there" });
    });

    expect(returned).toBeUndefined();
    expect(result.current.comments).toEqual([]);
    expect(result.current.submittingComment).toBe(false);
  });

  it("does not submit and signals login-required when there is no authenticated user", async () => {
    const entity = makeEntity({ id: "entity-1" });
    const loginRequiredCallback = vi.fn();

    const { result, axiosPrivate } = renderHookWithAxios(
      () =>
        useCommentSectionData({
          entity,
          callbacks: { loginRequiredCallback },
        }),
      {
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", emptyCommentsPage()),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createComment({ content: "Hello there" });
    });

    expect(loginRequiredCallback).toHaveBeenCalledTimes(1);
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("soft-deletes a comment (Reddit-style placeholder) via deleteComment", async () => {
    const entity = makeEntity({ id: "entity-1" });
    const commentId = "11111111-1111-4111-8111-111111111111";
    const seededComment = makeComment({ id: commentId, entityId: "entity-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ entity }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            data: [seededComment],
            pagination: { page: 1, pageSize: 15, totalPages: 1, totalItems: 1, hasMore: false },
          }),
      },
    );

    await waitFor(() => expect(result.current.comments).toEqual([seededComment]));

    axiosPrivate.mockResponse("delete", undefined, 204);

    await act(async () => {
      await result.current.deleteComment({ commentId });
    });

    const deletedEntry = result.current.entityCommentsTree[commentId];
    expect(deletedEntry.comment.userDeletedAt).not.toBeNull();
    expect(deletedEntry.comment.content).toBeNull();

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe(`/test-project/comments/${commentId}`);
  });

  it("does not throw when deleteComment's request fails", async () => {
    const entity = makeEntity({ id: "entity-1" });
    const commentId = "11111111-1111-4111-8111-111111111111";
    const seededComment = makeComment({ id: commentId, entityId: "entity-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ entity }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            data: [seededComment],
            pagination: { page: 1, pageSize: 15, totalPages: 1, totalItems: 1, hasMore: false },
          }),
      },
    );

    await waitFor(() => expect(result.current.comments).toEqual([seededComment]));

    axiosPrivate.mockError("delete", 500, { message: "Internal error" });

    await expect(
      act(async () => {
        await result.current.deleteComment({ commentId });
      }),
    ).resolves.not.toThrow();
  });

  it("updates a comment via updateComment", async () => {
    const entity = makeEntity({ id: "entity-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ entity }),
      {
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", emptyCommentsPage()),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    axiosPrivate.mockResponse("patch", makeComment({ content: "updated" }));

    await act(async () => {
      await result.current.updateComment({ commentId: "comment-1", content: "updated" });
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/test-project/comments/comment-1");
    expect(call.body).toEqual({ content: "updated" });
  });

  it("fetches and exposes a highlighted comment by ID", async () => {
    const targetComment = makeComment({ id: "comment-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCommentSectionData({ highlightedCommentId: "comment-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", { comment: targetComment }),
      },
    );

    await waitFor(() =>
      expect(result.current.highlightedComment).toEqual({
        comment: targetComment,
        parentComment: null,
      }),
    );

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/comments/comment-1");
  });
});
