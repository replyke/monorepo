import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../../test-utils";
import useFetchFollowersCountByUserId from "./useFetchFollowersCountByUserId";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchFollowersCountByUserId", () => {
  it("fetches another user's followers count", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchFollowersCountByUserId(),
    );

    axiosPrivate.mockResponse("get", { count: 9 });

    let returned;
    await act(async () => {
      returned = await result.current({ userId: "user-2" });
    });

    expect(returned).toEqual({ count: 9 });

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/user-2/followers-count");
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchFollowersCountByUserId(),
    );

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no user ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchFollowersCountByUserId(),
    );

    await expect(result.current({ userId: "" })).rejects.toThrow(
      "No userId provided.",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
