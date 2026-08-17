import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useUpdateWorkspace from "./useUpdateWorkspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useUpdateWorkspace", () => {
  it("patches /workspaces/:id with the rest of the props as the body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspace(),
      { projectId: "project-1", user }
    );

    const workspace = { id: "w1", name: "Renamed" };
    axiosPrivate.mockResponse("patch", workspace);

    let returned: typeof workspace | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        name: "Renamed",
        metadata: { tier: "pro" },
      });
    });

    expect(returned).toEqual(workspace);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/project-1/workspaces/w1");
    expect(call.body).toEqual({ name: "Renamed", metadata: { tier: "pro" } });
    // workspaceId is a path param, never in the body.
    expect(call.body).not.toHaveProperty("workspaceId");
  });

  it("does not forward an actor userId even if a caller smuggles one in", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("patch", { id: "w1" });

    await act(async () => {
      await result.current({
        workspaceId: "w1",
        name: "Renamed",
        // @ts-expect-error the actor userId is node-sdk-only and not part of the props
        userId: "someone-else",
      });
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.body).toEqual({ name: "Renamed" });
    expect(call.body).not.toHaveProperty("userId");
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspace(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ name: "Renamed" })
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
