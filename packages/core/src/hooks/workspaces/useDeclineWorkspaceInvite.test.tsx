import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useDeclineWorkspaceInvite from "./useDeclineWorkspaceInvite";

afterEach(() => {
  resetAxiosMocks();
});

describe("useDeclineWorkspaceInvite", () => {
  it("posts an EMPTY body to the non-:id-scoped decline route (actor from token)", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useDeclineWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    const response = { success: true };
    axiosPrivate.mockResponse("post", response);

    let returned: typeof response | undefined;
    await act(async () => {
      returned = await result.current({ inviteId: "i1" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/project-1/workspace-invites/i1/decline");
    expect(call.body).toEqual({});
  });

  it("throws before requesting when inviteId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useDeclineWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting inviteId
      result.current({})
    ).rejects.toThrow("Please pass an inviteId");

    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
