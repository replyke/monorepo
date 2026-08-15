import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../../test-utils";
import useRequestConnection from "./useRequestConnection";

afterEach(() => {
  resetAxiosMocks();
});

describe("useRequestConnection", () => {
  it("sends a connection request with an optional message", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useRequestConnection());

    const response = { id: "connection-1", status: "pending", createdAt: "2024-01-01T00:00:00.000Z" };
    axiosPrivate.mockResponse("post", response);

    let returned;
    await act(async () => {
      returned = await result.current({ userId: "user-2", message: "Let's connect" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/users/user-2/connection");
    expect(call.body).toEqual({ message: "Let's connect" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useRequestConnection());

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    await expect(
      result.current({ userId: "user-2" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no user ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useRequestConnection());

    await expect(result.current({ userId: "" })).rejects.toThrow(
      "No user ID was provided",
    );
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useRequestConnection(), {
      projectId: "",
    });

    await expect(result.current({ userId: "user-2" })).rejects.toThrow(
      "No project specified",
    );
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
