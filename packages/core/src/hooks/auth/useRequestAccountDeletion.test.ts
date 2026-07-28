import { describe, it, expect, afterEach } from "vitest";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useRequestAccountDeletion from "./useRequestAccountDeletion";

afterEach(() => {
  resetAxiosMocks();
});

describe("useRequestAccountDeletion", () => {
  it("requests an account-deletion confirmation email", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useRequestAccountDeletion(),
    );

    axiosPrivate.mockResponse("post", { success: true });

    const returned = await result.current();

    expect(returned).toEqual({ success: true });

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/auth/request-account-deletion");
    expect(call.body).toEqual({});
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useRequestAccountDeletion(),
    );

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    await expect(result.current()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRequestAccountDeletion(),
      { projectId: "" },
    );

    await expect(result.current()).rejects.toThrow("No projectId available.");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
