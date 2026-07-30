import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../../test-utils";
import useBlockUser from "./useBlockUser";

afterEach(() => {
  resetAxiosMocks();
});

describe("useBlockUser", () => {
  it("blocks a user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBlockUser());

    axiosPrivate.mockResponse("post", undefined, 201);

    await act(async () => {
      await result.current({ userId: "user-2" });
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/users/user-2/block");
    expect(call.body).toEqual({});
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBlockUser());

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no user ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBlockUser());

    await expect(result.current({ userId: "" })).rejects.toThrow(
      "No user ID was provided",
    );
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBlockUser(), {
      projectId: "",
    });

    await expect(result.current({ userId: "user-2" })).rejects.toThrow(
      "No project specified",
    );
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
