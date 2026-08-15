import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser, makeUser } from "../../../test-utils";
import useFetchConnections from "./useFetchConnections";
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

describe("useFetchConnections", () => {
  it("fetches the current user's established connections", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnections(), { user });

    const page = makePage([{ id: "connection-1", connectedUser: makeUser(), connectedAt: "2024-01-01T00:00:00.000Z" }]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<EstablishedConnection> | undefined;
    await act(async () => {
      returned = await result.current({ page: 1, limit: 20 });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/connections");
    expect(call.config?.params).toEqual({ page: 1, limit: 20 });
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnections(), { user });

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(result.current()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnections());

    await expect(result.current()).rejects.toThrow("No user is logged in");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when there is no project", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnections(), {
      user,
      projectId: "",
    });

    await expect(result.current()).rejects.toThrow("No project specified");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
