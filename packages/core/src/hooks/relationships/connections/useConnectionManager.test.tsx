import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useConnectionManager from "./useConnectionManager";

afterEach(() => {
  resetAxiosMocks();
});

describe("useConnectionManager", () => {
  it("loads 'none' status on mount and sends a connection request", async () => {
    const user = makeAuthUser({ id: "user-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useConnectionManager({ userId: "user-2" }),
      {
        user,
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", { status: "none" }),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionStatus).toBe("none");

    axiosPrivate.mockResponse("post", {
      id: "connection-1",
      status: "pending",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    await act(async () => {
      await result.current.sendConnectionRequest("Hi there");
    });

    expect(result.current.connectionStatus).toBe("pending-sent");
    expect(result.current.connectionId).toBe("connection-1");

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/users/user-2/connection");
    expect(call.body).toEqual({ message: "Hi there" });
  });

  it("accepts a received pending request and reloads the status", async () => {
    const user = makeAuthUser({ id: "user-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useConnectionManager({ userId: "user-2" }),
      {
        user,
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            status: "pending",
            type: "received",
            connectionId: "connection-1",
            createdAt: "2024-01-01T00:00:00.000Z",
          }),
      },
    );

    await waitFor(() => expect(result.current.connectionStatus).toBe("pending-received"));

    axiosPrivate.mockResponse("patch", { id: "connection-1", status: "connected" });
    axiosPrivate.mockResponse("get", {
      status: "connected",
      connectionId: "connection-1",
      connectedAt: "2024-01-02T00:00:00.000Z",
      requestedAt: "2024-01-01T00:00:00.000Z",
    });

    await act(async () => {
      await result.current.acceptConnectionRequest();
    });

    await waitFor(() => expect(result.current.connectionStatus).toBe("connected"));

    const patchCall = axiosPrivate.calls("patch")[0];
    expect(patchCall.url).toBe("/test-project/connections/connection-1/accept");
  });

  it("declines a received pending request", async () => {
    const user = makeAuthUser({ id: "user-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useConnectionManager({ userId: "user-2" }),
      {
        user,
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            status: "pending",
            type: "received",
            connectionId: "connection-1",
            createdAt: "2024-01-01T00:00:00.000Z",
          }),
      },
    );

    await waitFor(() => expect(result.current.connectionStatus).toBe("pending-received"));

    axiosPrivate.mockResponse("patch", {
      id: "connection-1",
      status: "declined",
      respondedAt: "2024-01-02T00:00:00.000Z",
    });

    await act(async () => {
      await result.current.declineConnectionRequest();
    });

    expect(result.current.connectionStatus).toBe("declined-received");
  });

  it("withdraws a sent pending request", async () => {
    const user = makeAuthUser({ id: "user-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useConnectionManager({ userId: "user-2" }),
      {
        user,
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", {
            status: "pending",
            type: "sent",
            connectionId: "connection-1",
            createdAt: "2024-01-01T00:00:00.000Z",
          }),
      },
    );

    await waitFor(() => expect(result.current.connectionStatus).toBe("pending-sent"));

    axiosPrivate.mockResponse("delete", { message: "Removed" });

    await act(async () => {
      await result.current.withdrawConnectionRequest();
    });

    expect(result.current.connectionStatus).toBe("none");
    expect(result.current.connectionId).toBeNull();
  });

  it("treats checking your own userId as 'none' without making a request", async () => {
    const user = makeAuthUser({ id: "user-1" });

    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useConnectionManager({ userId: "user-1" }),
      { user },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionStatus).toBe("none");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("falls back to 'none' without throwing when the status fetch fails", async () => {
    const user = makeAuthUser({ id: "user-1" });

    const { result } = renderHookWithAxios(
      () => useConnectionManager({ userId: "user-2" }),
      {
        user,
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockError("get", 500, { message: "Internal error" }),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionStatus).toBe("none");
  });
});
