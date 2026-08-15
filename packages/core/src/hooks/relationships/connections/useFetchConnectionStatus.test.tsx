import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useFetchConnectionStatus from "./useFetchConnectionStatus";
import type { ConnectionStatusResponse } from "../../../interfaces/models/Connection";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchConnectionStatus", () => {
  it("fetches the connection status with another user", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionStatus(), { user });

    const response: ConnectionStatusResponse = {
      status: "connected",
      connectionId: "connection-1",
      connectedAt: "2024-01-01T00:00:00.000Z",
      requestedAt: "2023-12-31T00:00:00.000Z",
    };
    axiosPrivate.mockResponse("get", response);

    let returned: ConnectionStatusResponse | undefined;
    await act(async () => {
      returned = await result.current({ userId: "user-2" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/user-2/connection");
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionStatus(), { user });

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when checking status with yourself", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionStatus(), { user });

    await expect(result.current({ userId: "user-1" })).rejects.toThrow(
      "Cannot check connection status with yourself",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionStatus());

    await expect(result.current({ userId: "user-2" })).rejects.toThrow(
      "No user is logged in",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
