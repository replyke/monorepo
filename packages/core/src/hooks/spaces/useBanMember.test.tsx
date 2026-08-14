import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useBanMember from "./useBanMember";

afterEach(() => {
  resetAxiosMocks();
});

describe("useBanMember", () => {
  it("bans a member from the space", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBanMember());

    axiosPrivate.mockResponse("patch", {
      message: "Member has been banned from the space.",
      membership: { id: "membership-1", status: "banned" },
    });

    let returned;
    await act(async () => {
      returned = await result.current({ spaceId: "space-1", memberId: "membership-1" });
    });

    expect(returned).toEqual({
      message: "Member has been banned from the space.",
      membership: { id: "membership-1", status: "banned" },
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/test-project/spaces/space-1/members/membership-1/ban");
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBanMember());

    axiosPrivate.mockError("patch", 403, { message: "Forbidden" });

    await expect(
      result.current({ spaceId: "space-1", memberId: "membership-1" }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("throws before making a request when required fields are missing", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useBanMember());

    await expect(
      result.current({ spaceId: "space-1", memberId: "" }),
    ).rejects.toThrow("spaceId and memberId are required");
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
