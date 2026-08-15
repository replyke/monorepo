import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useAcceptConnection from "./useAcceptConnection";

afterEach(() => {
  resetAxiosMocks();
});

describe("useAcceptConnection", () => {
  it("accepts a connection request", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useAcceptConnection(), { user });

    const response = { id: "connection-1", status: "connected" };
    axiosPrivate.mockResponse("patch", response);

    let returned;
    await act(async () => {
      returned = await result.current({ connectionId: "connection-1" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/test-project/connections/connection-1/accept");
    expect(call.body).toEqual({});
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useAcceptConnection(), { user });

    axiosPrivate.mockError("patch", 500, { message: "Internal error" });

    await expect(
      result.current({ connectionId: "connection-1" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no connection ID is passed", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useAcceptConnection(), { user });

    await expect(result.current({ connectionId: "" })).rejects.toThrow(
      "No connection ID was provided",
    );
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useAcceptConnection());

    await expect(result.current({ connectionId: "connection-1" })).rejects.toThrow(
      "No user is logged in",
    );
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
