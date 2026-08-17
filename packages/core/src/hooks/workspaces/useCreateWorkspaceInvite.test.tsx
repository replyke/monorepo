import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useCreateWorkspaceInvite from "./useCreateWorkspaceInvite";
import type { WorkspaceInvitation } from "../../interfaces/models/Workspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useCreateWorkspaceInvite", () => {
  it("strips workspaceId into the path and posts the rest as the body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    const invite: Partial<WorkspaceInvitation> = { id: "i1", status: "pending" };
    axiosPrivate.mockResponse("post", invite, 201);

    let returned: WorkspaceInvitation | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        email: "New.Member@Example.com",
        capabilities: ["invite"],
        rank: 2,
      });
    });

    expect(returned).toEqual(invite);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/project-1/workspaces/w1/invites");
    expect(call.body).toEqual({
      email: "New.Member@Example.com",
      capabilities: ["invite"],
      rank: 2,
    });
    // workspaceId is a path param, never in the body.
    expect(call.body).not.toHaveProperty("workspaceId");
  });

  it("allows a userId in the body — the invite TARGET, not the actor", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("post", { id: "i2" }, 201);

    await act(async () => {
      await result.current({ workspaceId: "w1", userId: "invitee1", rank: 1 });
    });

    const [call] = axiosPrivate.calls("post");
    // The inviter (actor) is the token user; `userId` here addresses the invitee.
    expect(call.body).toEqual({ userId: "invitee1", rank: 1 });
  });

  it("throws before requesting when workspaceId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspaceInvite(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ rank: 1 })
    ).rejects.toThrow("Please pass a workspaceId");

    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
