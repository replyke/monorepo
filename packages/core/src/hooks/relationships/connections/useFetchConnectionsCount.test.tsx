import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../../test-utils";
import useFetchConnectionsCount from "./useFetchConnectionsCount";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchConnectionsCount", () => {
  it("fetches the current user's connections count", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionsCount(), { user });

    axiosPrivate.mockResponse("get", { count: 5 });

    let returned;
    await act(async () => {
      returned = await result.current();
    });

    expect(returned).toEqual({ count: 5 });

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/connections/count");
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionsCount(), { user });

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(result.current()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchConnectionsCount());

    await expect(result.current()).rejects.toThrow("No user is logged in");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
