import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useFetchManyComments from "./useFetchManyComments";
import { makeComment } from "./testHelpers";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Comment } from "../../interfaces/models/Comment";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(comments: Comment[], hasMore: boolean): PaginatedResponse<Comment> {
  return {
    data: comments,
    pagination: {
      page: 1,
      pageSize: 10,
      totalPages: hasMore ? 2 : 1,
      totalItems: comments.length,
      hasMore,
    },
  };
}

describe("useFetchManyComments", () => {
  it("fetches a page of comments with the expected params", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyComments());

    const page = makePage([makeComment()], false);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<Comment> | undefined;
    await act(async () => {
      returned = await result.current({ entityId: "entity-1", page: 1, sortBy: "new" });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/comments");
    expect(call.config?.params).toMatchObject({
      entityId: "entity-1",
      page: 1,
      sortBy: "new",
    });
  });

  it("includes optional filters and include param when provided", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyComments());

    axiosPrivate.mockResponse("get", makePage([], false));

    await act(async () => {
      await result.current({
        userId: "user-1",
        parentId: "comment-1",
        sourceId: "source-1",
        page: 1,
        include: ["user", "parent"],
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({
      userId: "user-1",
      parentId: "comment-1",
      sourceId: "source-1",
      include: "user,parent",
    });
  });

  it("forwards the blockedFilter opt-in param to the request", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyComments());

    axiosPrivate.mockResponse("get", makePage([], false));

    await act(async () => {
      await result.current({
        entityId: "entity-1",
        page: 1,
        blockedFilter: "include-outbound-blocked",
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({
      blockedFilter: "include-outbound-blocked",
    });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyComments());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ entityId: "entity-1", page: 1 }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when page is 0", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyComments());

    await expect(result.current({ page: 0 })).rejects.toThrow(
      "Can't fetch comments with page 0",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when limit is 0", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyComments());

    await expect(result.current({ page: 1, limit: 0 })).rejects.toThrow(
      "Can't fetch with limit 0",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyComments(),
      { projectId: "" },
    );

    await expect(result.current({ page: 1 })).rejects.toThrow(
      "No project specified",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
