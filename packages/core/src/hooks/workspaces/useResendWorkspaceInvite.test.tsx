import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useResendWorkspaceInvite from "./useResendWorkspaceInvite";
import type { WorkspaceInvitation } from "../../interfaces/models/Workspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useResendWorkspaceInvite", () => {
  it("POSTs (not DELETEs) to .../invites/:inviteId/resend with an empty body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useResendWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    const invite: Partial<WorkspaceInvitation> = {
      id: "i1",
      status: "pending",
    };
    axiosPrivate.mockResponse("post", invite);

    let returned: WorkspaceInvitation | undefined;
    await act(async () => {
      returned = await result.current({ workspaceId: "w1", inviteId: "i1" });
    });

    expect(returned).toEqual(invite);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/project-1/workspaces/w1/invites/i1/resend");
    // Empty body — no actor userId; the actor is the token subject.
    expect(call.body).toEqual({});
  });

  it("throws before requesting when workspaceId or inviteId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useResendWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ inviteId: "i1" })
    ).rejects.toThrow("Please pass a workspaceId");

    await expect(
      // @ts-expect-error deliberately omitting inviteId
      result.current({ workspaceId: "w1" })
    ).rejects.toThrow("Please pass an inviteId");

    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("rejects with 409 on a terminal (already accepted/declined/revoked) invite", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useResendWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("post", 409, { code: "workspace/invite-terminal" });

    await expect(
      result.current({ workspaceId: "w1", inviteId: "i1" })
    ).rejects.toMatchObject({ response: { status: 409 } });
  });
});
