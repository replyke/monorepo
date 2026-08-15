import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useFetchComment from "./useFetchComment";
import { makeComment } from "./testHelpers";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchComment", () => {
  it("fetches a comment by ID", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchComment());

    const comment = makeComment();
    axiosPrivate.mockResponse("get", { comment });

    let returned: { comment: typeof comment } | undefined;
    await act(async () => {
      returned = await result.current({ commentId: "comment-1" });
    });

    expect(returned).toEqual({ comment });

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/comments/comment-1");
  });

  it("joins an include array into a comma-separated param", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchComment());

    axiosPrivate.mockResponse("get", { comment: makeComment() });

    await act(async () => {
      await result.current({ commentId: "comment-1", include: ["user", "parent"] });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({ include: "user,parent" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchComment());

    axiosPrivate.mockError("get", 404, { message: "Not found" });

    await expect(
      result.current({ commentId: "comment-1" }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("throws before making a request when no comment ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchComment());

    await expect(result.current({ commentId: "" })).rejects.toThrow(
      "No comment ID passed",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
