import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useDeleteSpace from "./useDeleteSpace";
import type { DeleteSpaceResponse } from "../../interfaces/models/Space";

afterEach(() => {
  resetAxiosMocks();
});

describe("useDeleteSpace", () => {
  it("deletes the space and returns the confirmation message", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useDeleteSpace());

    const response: DeleteSpaceResponse = {
      message: "Space deleted successfully.",
    };
    axiosPrivate.mockResponse("delete", response);

    let returned: DeleteSpaceResponse | undefined;
    await act(async () => {
      returned = await result.current({ spaceId: "space-1" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/test-project/spaces/space-1");
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useDeleteSpace());

    axiosPrivate.mockError("delete", 500, { message: "Internal error" });

    await expect(
      result.current({ spaceId: "space-1" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when no space ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useDeleteSpace());

    await expect(result.current({ spaceId: "" })).rejects.toThrow(
      "Please pass a spaceId",
    );
    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useDeleteSpace(), {
      projectId: "",
    });

    await expect(result.current({ spaceId: "space-1" })).rejects.toThrow(
      "No projectId available.",
    );
    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });
});
