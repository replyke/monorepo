import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeReaction } from "../../test-utils";
import useFetchCommentReactionsWrapper from "./useFetchCommentReactionsWrapper";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Reaction } from "../../interfaces/models/Reaction";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(reactions: Reaction[], hasMore: boolean): PaginatedResponse<Reaction> {
  return {
    data: reactions,
    pagination: {
      page: 1,
      pageSize: 20,
      totalPages: hasMore ? 2 : 1,
      totalItems: reactions.length,
      hasMore,
    },
  };
}

describe("useFetchCommentReactionsWrapper", () => {
  it("does not fetch on mount when autoFetch is false (the default)", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchCommentReactionsWrapper({ commentId: "comment-1" }),
    );

    expect(result.current.loading).toBe(false);
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("fetches on mount when autoFetch is true, and loads more on demand", async () => {
    const firstReaction = makeReaction({ id: "reaction-1", targetType: "comment", targetId: "comment-1" });
    const secondReaction = makeReaction({ id: "reaction-2", targetType: "comment", targetId: "comment-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchCommentReactionsWrapper({ commentId: "comment-1", autoFetch: true }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", makePage([firstReaction], true)),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reactions).toEqual([firstReaction]);

    axiosPrivate.mockResponse("get", makePage([secondReaction], false));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(result.current.reactions).toEqual([firstReaction, secondReaction]);
  });

  it("refetch() re-runs the query from page 1", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchCommentReactionsWrapper({ commentId: "comment-1" }),
    );

    axiosPrivate.mockResponse(
      "get",
      makePage([makeReaction({ targetType: "comment", targetId: "comment-1" })], false),
    );

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.reactions).toHaveLength(1));
  });

  it("stops loading without throwing when the request fails", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchCommentReactionsWrapper({ commentId: "comment-1" }),
    );

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reactions).toEqual([]);
  });
});
