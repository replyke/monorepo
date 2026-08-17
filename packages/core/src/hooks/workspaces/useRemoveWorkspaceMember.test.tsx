import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useRemoveWorkspaceMember from "./useRemoveWorkspaceMember";

afterEach(() => {
  resetAxiosMocks();
});

describe("useRemoveWorkspaceMember", () => {
  it("deletes /workspaces/:id/members/:targetUserId with no request body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveWorkspaceMember(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("delete", undefined, 204);

    await act(async () => {
      await result.current({ workspaceId: "w1", targetUserId: "user-2" });
    });

    const [call] = axiosPrivate.calls("delete");
    // targetUserId addresses the member being removed, in the path.
    expect(call.url).toBe("/project-1/workspaces/w1/members/user-2");
    // node-sdk sends `{ data: { userId } }` (the ACTOR) here; the client must not.
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when workspaceId or targetUserId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveWorkspaceMember(),
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

    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });

  it("rejects when the actor is out-ranked", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useRemoveWorkspaceMember(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("delete", 403, { code: "workspace/rank-too-low" });

    await expect(
      result.current({ workspaceId: "w1", targetUserId: "user-2" })
    ).rejects.toMatchObject({ response: { status: 403 } });
  });
});
