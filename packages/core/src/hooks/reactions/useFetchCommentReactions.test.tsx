import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeReaction } from "../../test-utils";
import useFetchCommentReactions from "./useFetchCommentReactions";
import type { Reaction } from "../../interfaces/models/Reaction";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(reactions: Reaction[]): PaginatedResponse<Reaction> {
  return {
    data: reactions,
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalItems: reactions.length, hasMore: false },
  };
}

describe("useFetchCommentReactions", () => {
  it("fetches a page of reactions for a comment", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchCommentReactions());

    const page = makePage([
      makeReaction({ targetType: "comment", targetId: "comment-1" }),
    ]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<Reaction> | undefined;
    await act(async () => {
      returned = await result.current({ commentId: "comment-1", page: 1 });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/comments/comment-1/reactions");
    expect(call.config?.params).toMatchObject({ page: 1, limit: 20, sortDir: "desc" });
  });

  it("filters by reactionType when provided", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchCommentReactions());

    axiosPrivate.mockResponse("get", makePage([]));

    await act(async () => {
      await result.current({ commentId: "comment-1", page: 1, reactionType: "love" });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({ reactionType: "love" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchCommentReactions());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ commentId: "comment-1", page: 1 }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when page is 0", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchCommentReactions());

    await expect(
      result.current({ commentId: "comment-1", page: 0 }),
    ).rejects.toThrow("Can't fetch reactions with page 0");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when no comment ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchCommentReactions());

    await expect(
      result.current({ commentId: "", page: 1 }),
    ).rejects.toThrow("No comment ID provided");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
