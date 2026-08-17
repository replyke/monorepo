import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useDeleteWorkspace from "./useDeleteWorkspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useDeleteWorkspace", () => {
  it("deletes /workspaces/:id with no request body at all", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useDeleteWorkspace(),
      { projectId: "project-1", user }
    );

    const response = { message: "Workspace deleted successfully." };
    axiosPrivate.mockResponse("delete", response);

    let returned: typeof response | undefined;
    await act(async () => {
      returned = await result.current({ workspaceId: "w1" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/project-1/workspaces/w1");
    // node-sdk sends `{ data: { userId } }` here for its act-as-user path; the
    // client SDK must send nothing — the owner is resolved from the token.
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useDeleteWorkspace(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({})
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });

  it("rejects when the server refuses the delete (non-owner)", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useDeleteWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("delete", 403, { code: "workspace/not-owner" });

    await expect(result.current({ workspaceId: "w1" })).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
