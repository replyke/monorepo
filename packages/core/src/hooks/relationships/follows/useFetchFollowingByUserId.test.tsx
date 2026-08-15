import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeUser } from "../../../test-utils";
import useFetchFollowingByUserId from "./useFetchFollowingByUserId";
import type { PaginatedResponse } from "../../../interfaces/PaginatedResponse";
import type { FollowingWithFollowInfo } from "./useFetchFollowingByUserId";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(items: FollowingWithFollowInfo[]): PaginatedResponse<FollowingWithFollowInfo> {
  return {
    data: items,
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalItems: items.length, hasMore: false },
  };
}

describe("useFetchFollowingByUserId", () => {
  it("fetches another user's following list", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchFollowingByUserId());

    const page = makePage([{ followId: "follow-1", user: makeUser(), followedAt: "2024-01-01T00:00:00.000Z" }]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<FollowingWithFollowInfo> | undefined;
    await act(async () => {
      returned = await result.current({ userId: "user-2", page: 1 });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/user-2/following");
    expect(call.config?.params).toMatchObject({ page: 1, limit: 20 });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchFollowingByUserId());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no user ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchFollowingByUserId());

    await expect(result.current({ userId: "" })).rejects.toThrow(
      "No userId provided.",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
