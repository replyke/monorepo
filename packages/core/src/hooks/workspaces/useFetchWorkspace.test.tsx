import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useFetchWorkspace from "./useFetchWorkspace";
import type { Workspace } from "../../interfaces/models/Workspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchWorkspace", () => {
  it("gets /workspaces/:id with no include param and returns the workspace", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspace(),
      { projectId: "project-1", user }
    );

    const workspace: Partial<Workspace> = { id: "w1", name: "Acme" };
    axiosPrivate.mockResponse("get", workspace);

    let returned: Workspace | undefined;
    await act(async () => {
      returned = await result.current({ workspaceId: "w1" });
    });

    expect(returned).toEqual(workspace);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/project-1/workspaces/w1");
    expect(call.config?.params).toBeUndefined();
  });

  it("passes include=memberCount as a param (joins an array include)", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("get", { id: "w1" });

    await act(async () => {
      await result.current({ workspaceId: "w1", include: ["memberCount"] });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toEqual({ include: "memberCount" });
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspace(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({})
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
