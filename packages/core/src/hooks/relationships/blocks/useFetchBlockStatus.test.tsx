import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useFetchBlockStatus from "./useFetchBlockStatus";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchBlockStatus", () => {
  it("fetches the outbound block status with another user", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchBlockStatus(), { user });

    axiosPrivate.mockResponse("get", {
      blocked: true,
      blockId: "block-1",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    let returned;
    await act(async () => {
      returned = await result.current({ userId: "user-2" });
    });

    expect(returned).toEqual({
      blocked: true,
      blockId: "block-1",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/user-2/block");
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchBlockStatus(), { user });

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when checking status with yourself", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchBlockStatus(), { user });

    await expect(result.current({ userId: "user-1" })).rejects.toThrow(
      "Users don't block themselves",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchBlockStatus());

    await expect(result.current({ userId: "user-2" })).rejects.toThrow(
      "No user is logged in",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
