import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeUser } from "../../../test-utils";
import useFetchConnectionsByUserId from "./useFetchConnectionsByUserId";
import type { EstablishedConnection } from "../../../interfaces/models/Connection";
import type { PaginatedResponse } from "../../../interfaces/PaginatedResponse";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(connections: EstablishedConnection[]): PaginatedResponse<EstablishedConnection> {
  return {
    data: connections,
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalItems: connections.length, hasMore: false },
  };
}

describe("useFetchConnectionsByUserId", () => {
  it("fetches another user's established connections", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionsByUserId());

    const page = makePage([{ id: "connection-1", connectedUser: makeUser(), connectedAt: "2024-01-01T00:00:00.000Z" }]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<EstablishedConnection> | undefined;
    await act(async () => {
      returned = await result.current({ userId: "user-2", page: 1 });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/user-2/connections");
    expect(call.config?.params).toMatchObject({ page: 1, limit: 20 });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionsByUserId());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no user ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionsByUserId());

    await expect(result.current({ userId: "" })).rejects.toThrow(
      "No user ID was provided",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
