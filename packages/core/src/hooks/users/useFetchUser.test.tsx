import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeUser } from "../../test-utils";
import useFetchUser from "./useFetchUser";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchUser", () => {
  it("fetches a user by ID", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchUser());

    const user = makeUser();
    axiosPrivate.mockResponse("get", user);

    let returned: typeof user | undefined;
    await act(async () => {
      returned = await result.current({ userId: "user-1" });
    });

    expect(returned).toEqual(user);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/user-1");
  });

  it("passes the spaceReputationId param through", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchUser());

    axiosPrivate.mockResponse("get", makeUser());

    await act(async () => {
      await result.current({ userId: "user-1", spaceReputationId: "none" });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({ spaceReputationId: "none" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchUser());

    axiosPrivate.mockError("get", 404, { message: "Not found" });

    await expect(
      result.current({ userId: "user-1" }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("throws before making a request when no user ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchUser());

    await expect(result.current({ userId: "" })).rejects.toThrow(
      "Please specify a user ID",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
