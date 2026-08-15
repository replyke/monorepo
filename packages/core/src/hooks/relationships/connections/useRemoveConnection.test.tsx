import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useRemoveConnection from "./useRemoveConnection";

afterEach(() => {
  resetAxiosMocks();
});

describe("useRemoveConnection", () => {
  it("removes (withdraws/disconnects) a connection", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useRemoveConnection(), { user });

    axiosPrivate.mockResponse("delete", { message: "Connection removed" });

    let returned;
    await act(async () => {
      returned = await result.current({ connectionId: "connection-1" });
    });

    expect(returned).toEqual({ message: "Connection removed" });

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/test-project/connections/connection-1");
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useRemoveConnection(), { user });

    axiosPrivate.mockError("delete", 500, { message: "Internal error" });

    await expect(
      result.current({ connectionId: "connection-1" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no connection ID is passed", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useRemoveConnection(), { user });

    await expect(result.current({ connectionId: "" })).rejects.toThrow(
      "No connection ID was provided",
    );
    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });
});
