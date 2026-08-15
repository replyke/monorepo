import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useRemoveConnectionByUserId from "./useRemoveConnectionByUserId";

afterEach(() => {
  resetAxiosMocks();
});

describe("useRemoveConnectionByUserId", () => {
  it("removes a connection by the other user's ID", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveConnectionByUserId(),
      { user },
    );

    const response = { action: "disconnect" as const, message: "Disconnected" };
    axiosPrivate.mockResponse("delete", response);

    let returned;
    await act(async () => {
      returned = await result.current({ userId: "user-2" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/test-project/users/user-2/connection");
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveConnectionByUserId(),
      { user },
    );

    axiosPrivate.mockError("delete", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when disconnecting from yourself", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveConnectionByUserId(),
      { user },
    );

    await expect(result.current({ userId: "user-1" })).rejects.toThrow(
      "Cannot disconnect from yourself",
    );
    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useRemoveConnectionByUserId(),
    );

    await expect(result.current({ userId: "user-2" })).rejects.toThrow(
      "No user is logged in",
    );
    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });
});
