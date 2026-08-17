import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useUpdateWorkspaceInheritFlag from "./useUpdateWorkspaceInheritFlag";

afterEach(() => {
  resetAxiosMocks();
});

describe("useUpdateWorkspaceInheritFlag", () => {
  it("patches /workspaces/:id/inherit-flag with only the flag in the body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspaceInheritFlag(),
      { projectId: "project-1", user }
    );

    const workspace = { id: "w1", inheritsFromParent: false };
    axiosPrivate.mockResponse("patch", workspace);

    let returned: typeof workspace | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        inheritsFromParent: false,
      });
    });

    expect(returned).toEqual(workspace);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/project-1/workspaces/w1/inherit-flag");
    expect(call.body).toEqual({ inheritsFromParent: false });
    // Actor comes from the token — no userId in the body.
    expect(call.body).not.toHaveProperty("userId");
  });

  it("ignores any extra props a caller smuggles in, including an actor userId", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspaceInheritFlag(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("patch", { id: "w1" });

    await act(async () => {
      await result.current({
        workspaceId: "w1",
        inheritsFromParent: true,
        // @ts-expect-error the actor userId is node-sdk-only and not part of the props
        userId: "someone-else",
      });
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.body).toEqual({ inheritsFromParent: true });
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspaceInheritFlag(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ inheritsFromParent: true })
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });

  it("throws before requesting when inheritsFromParent is not a boolean", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspaceInheritFlag(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting inheritsFromParent
      result.current({ workspaceId: "w1" })
    ).rejects.toThrow("Please pass a boolean inheritsFromParent");

    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
