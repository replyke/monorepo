import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useLeaveWorkspace from "./useLeaveWorkspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useLeaveWorkspace", () => {
  it("deletes the /members/me route with no request body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLeaveWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("delete", undefined, 204);

    await act(async () => {
      await result.current({ workspaceId: "w1" });
    });

    const [call] = axiosPrivate.calls("delete");
    // `me`, not a userId — the leaving user is always the token subject.
    expect(call.url).toBe("/project-1/workspaces/w1/members/me");
    // node-sdk sends `{ data: { userId } }` here; the client SDK must not.
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLeaveWorkspace(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({})
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("delete")).toHaveLength(0);
  });

  it("rejects when an owner tries to leave their own workspace", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useLeaveWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("delete", 409, { code: "workspace/owner-cannot-leave" });

    await expect(result.current({ workspaceId: "w1" })).rejects.toMatchObject({
      response: { status: 409 },
    });
  });
});
