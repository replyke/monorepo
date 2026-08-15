import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeSpace } from "../../test-utils";
import useFetchSpaceChildren from "./useFetchSpaceChildren";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Space } from "../../interfaces/models/Space";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(spaces: Space[]): PaginatedResponse<Space> {
  return {
    data: spaces,
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalItems: spaces.length, hasMore: false },
  };
}

describe("useFetchSpaceChildren", () => {
  it("fetches child spaces with default pagination", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchSpaceChildren());

    const page = makePage([makeSpace({ parentSpaceId: "space-1" })]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<Space> | undefined;
    await act(async () => {
      returned = await result.current({ spaceId: "space-1" });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/spaces/space-1/children");
    expect(call.config?.params).toMatchObject({ page: 1, limit: 20 });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchSpaceChildren());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ spaceId: "space-1" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no space ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchSpaceChildren());

    await expect(result.current({ spaceId: "" })).rejects.toThrow(
      "Please pass a spaceId",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
