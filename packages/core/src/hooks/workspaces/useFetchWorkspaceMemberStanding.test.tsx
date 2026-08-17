import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useFetchWorkspaceMemberStanding from "./useFetchWorkspaceMemberStanding";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchWorkspaceMemberStanding", () => {
  it("gets /workspaces/:id/members/:targetUserId with no query params", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceMemberStanding(),
      { projectId: "project-1", user }
    );

    const standing = {
      user: { id: "user-2" },
      reasons: ["member"],
      capabilities: ["view"],
      permissions: [],
      rank: 3,
      title: "Editor",
      metadata: {},
    };
    axiosPrivate.mockResponse("get", standing);

    let returned: typeof standing | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        targetUserId: "user-2",
      });
    });

    expect(returned).toEqual(standing);

    const [call] = axiosPrivate.calls("get");
    // targetUserId is the TARGET, carried in the path — not an actor param.
    expect(call.url).toBe("/project-1/workspaces/w1/members/user-2");
    // No actor userId is ever sent; the actor is the token subject.
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when workspaceId or targetUserId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceMemberStanding(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ targetUserId: "user-2" })
    ).rejects.toThrow("Please pass a workspaceId");

    await expect(
      // @ts-expect-error deliberately omitting targetUserId
      result.current({ workspaceId: "w1" })
    ).rejects.toThrow("Please pass a targetUserId");

    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
