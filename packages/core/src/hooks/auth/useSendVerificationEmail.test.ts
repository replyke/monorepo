import { describe, it, expect, afterEach } from "vitest";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useSendVerificationEmail from "./useSendVerificationEmail";

afterEach(() => {
  resetAxiosMocks();
});

describe("useSendVerificationEmail", () => {
  it("sends a verification email with default (empty) options", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useSendVerificationEmail(),
    );

    axiosPrivate.mockResponse("post", { success: true });

    const returned = await result.current();

    expect(returned).toEqual({ success: true });

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/auth/send-verification-email");
    expect(call.body).toEqual({});
  });

  it("passes mode/tokenFormat/tokenLength/redirectUrl through", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useSendVerificationEmail(),
    );

    axiosPrivate.mockResponse("post", { success: true });

    await result.current({
      mode: "link",
      tokenFormat: "alphanumeric",
      tokenLength: 32,
      redirectUrl: "https://app.example.com/verify",
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.body).toEqual({
      mode: "link",
      tokenFormat: "alphanumeric",
      tokenLength: 32,
      redirectUrl: "https://app.example.com/verify",
    });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useSendVerificationEmail(),
    );

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    await expect(result.current()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSendVerificationEmail(),
      { projectId: "" },
    );

    await expect(result.current()).rejects.toThrow("No projectId available.");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
