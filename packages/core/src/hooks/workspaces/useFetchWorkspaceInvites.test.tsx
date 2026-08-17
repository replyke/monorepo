import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useFetchWorkspaceInvites from "./useFetchWorkspaceInvites";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchWorkspaceInvites", () => {
  it("gets the invites a workspace ISSUED — /workspaces/:id/invites", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceInvites(),
      { projectId: "project-1", user }
    );

    const response = { data: [{ id: "i1", status: "pending" }] };
    axiosPrivate.mockResponse("get", response);

    let returned: typeof response | undefined;
    await act(async () => {
      returned = await result.current({ workspaceId: "w1" });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("get");
    // NOT `/me/workspace-invites` — that is useFetchMyWorkspaceInvites.
    expect(call.url).toBe("/project-1/workspaces/w1/invites");
    // Unpaginated + no actor param; the actor is the token subject.
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceInvites(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({})
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("rejects when the caller lacks the invite capability", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchWorkspaceInvites(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("get", 403, {
      code: "workspace/missing-capability",
    });

    await expect(result.current({ workspaceId: "w1" })).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
