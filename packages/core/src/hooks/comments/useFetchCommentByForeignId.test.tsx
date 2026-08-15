import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useFetchCommentByForeignId from "./useFetchCommentByForeignId";
import { makeComment } from "./testHelpers";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchCommentByForeignId", () => {
  it("fetches a comment by foreign ID", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchCommentByForeignId(),
    );

    const comment = makeComment({ foreignId: "ext-1" });
    axiosPrivate.mockResponse("get", { comment });

    let returned: { comment: typeof comment } | undefined;
    await act(async () => {
      returned = await result.current({ foreignId: "ext-1" });
    });

    expect(returned).toEqual({ comment });

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/comments/by-foreign-id");
    expect(call.config?.params).toMatchObject({ foreignId: "ext-1" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchCommentByForeignId(),
    );

    axiosPrivate.mockError("get", 404, { message: "Not found" });

    await expect(
      result.current({ foreignId: "ext-1" }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("throws before making a request when no foreign ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchCommentByForeignId(),
    );

    await expect(result.current({ foreignId: "" })).rejects.toThrow(
      "No foreign ID passed",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
