import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useFetchWorkspaceAuthority from "./useFetchWorkspaceAuthority";
import type { WorkspaceAuthority } from "../../interfaces/models/Workspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchWorkspaceAuthority", () => {
  it("gets the authority route with no params (bearer-token user's own standing)", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceAuthority(),
      { projectId: "project-1", user }
    );

    const authority: WorkspaceAuthority = {
      reasons: [{ type: "member" }],
      capabilities: ["invite"],
      permissions: [],
      rank: 3,
      // Always present on this read, and degenerate: an offset from you to
      // yourself is 0 (null when you hold no member row on the workspace).
      relativeRank: 0,
    };
    axiosPrivate.mockResponse("get", authority);

    let returned: WorkspaceAuthority | undefined;
    await act(async () => {
      returned = await result.current({ workspaceId: "w1" });
    });

    expect(returned).toEqual(authority);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/project-1/workspaces/w1/authority/me");
    // No config/params — the actor is the token user (no userId leak).
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceAuthority(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({})
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
