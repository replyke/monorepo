import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useRemoveWorkspaceMemberFromSubtree, {
  type RemoveWorkspaceMemberFromSubtreeResponse,
} from "./useRemoveWorkspaceMemberFromSubtree";

afterEach(() => {
  resetAxiosMocks();
});

describe("useRemoveWorkspaceMemberFromSubtree", () => {
  it("posts an EMPTY body to the subtree-offboarding route", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveWorkspaceMemberFromSubtree(),
      { projectId: "project-1", user }
    );

    const response: RemoveWorkspaceMemberFromSubtreeResponse = {
      removedCount: 2,
      removed: [
        { workspaceId: "w1", userId: "user-2" },
        { workspaceId: "w2", userId: "user-2" },
      ],
      // A non-owner's sweep can be partial — the hook passes the report through
      // verbatim, including entries whose identity the server withheld.
      skippedCount: 2,
      skipped: [
        { id: "w3", name: "Sealed Finance", reason: "out-of-reach" },
        { id: null, name: null, reason: "out-of-reach" },
      ],
    };
    axiosPrivate.mockResponse("post", response);

    let returned: typeof response | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        targetUserId: "user-2",
      });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe(
      "/project-1/workspaces/w1/members/user-2/remove-from-subtree"
    );
    // Empty body — node-sdk posts `{ userId }` (the ACTOR) here; the client
    // resolves the actor from the token instead.
    expect(call.body).toEqual({});
  });

  it("throws before requesting when workspaceId or targetUserId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveWorkspaceMemberFromSubtree(),
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

    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("rejects with 409 when the target owns a descendant workspace", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveWorkspaceMemberFromSubtree(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("post", 409, {
      code: "workspace/owns-descendants",
    });

    await expect(
      result.current({ workspaceId: "w1", targetUserId: "user-2" })
    ).rejects.toMatchObject({ response: { status: 409 } });
  });
});
