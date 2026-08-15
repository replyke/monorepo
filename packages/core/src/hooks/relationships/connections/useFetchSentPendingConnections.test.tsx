import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser, makeUser } from "../../../test-utils";
import useFetchSentPendingConnections from "./useFetchSentPendingConnections";
import type { PendingConnection } from "../../../interfaces/models/Connection";
import type { PaginatedResponse } from "../../../interfaces/PaginatedResponse";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(connections: PendingConnection[]): PaginatedResponse<PendingConnection> {
  return {
    data: connections,
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalItems: connections.length, hasMore: false },
  };
}

describe("useFetchSentPendingConnections", () => {
  it("fetches connection requests the current user sent", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchSentPendingConnections(),
      { user },
    );

    const page = makePage([
      { id: "connection-1", user: makeUser(), createdAt: "2024-01-01T00:00:00.000Z", type: "sent" },
    ]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<PendingConnection> | undefined;
    await act(async () => {
      returned = await result.current({ page: 1, limit: 10 });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/connections/pending/sent");
    expect(call.config?.params).toEqual({ page: 1, limit: 10 });
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchSentPendingConnections(),
      { user },
    );

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(result.current()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchSentPendingConnections(),
    );

    await expect(result.current()).rejects.toThrow("No user is logged in");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
