import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useTransferWorkspaceOwnership from "./useTransferWorkspaceOwnership";

afterEach(() => {
  resetAxiosMocks();
});

describe("useTransferWorkspaceOwnership", () => {
  it("posts to /workspaces/:id/transfer-ownership with the disposition body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useTransferWorkspaceOwnership(),
      { projectId: "project-1", user }
    );

    const workspace = { id: "w1", ownerId: "user-2" };
    axiosPrivate.mockResponse("post", workspace);

    let returned: typeof workspace | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        newOwnerId: "user-2",
        previousOwnerDisposition: "demote",
        previousOwnerRank: 5,
        previousOwnerCapabilities: ["invite"],
      });
    });

    expect(returned).toEqual(workspace);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/project-1/workspaces/w1/transfer-ownership");
    expect(call.body).toEqual({
      newOwnerId: "user-2",
      previousOwnerDisposition: "demote",
      previousOwnerRank: 5,
      previousOwnerCapabilities: ["invite"],
    });
    expect(call.body).not.toHaveProperty("workspaceId");
  });

  it("does not forward an actor userId — newOwnerId is the only user id sent", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useTransferWorkspaceOwnership(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("post", { id: "w1" });

    await act(async () => {
      await result.current({
        workspaceId: "w1",
        newOwnerId: "user-2",
        // @ts-expect-error the actor userId is node-sdk-only and not part of the props
        userId: "someone-else",
      });
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.body).toEqual({ newOwnerId: "user-2" });
    expect(call.body).not.toHaveProperty("userId");
  });

  it("throws before requesting when workspaceId or newOwnerId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useTransferWorkspaceOwnership(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ newOwnerId: "user-2" })
    ).rejects.toThrow("Please pass a workspaceId");

    await expect(
      // @ts-expect-error deliberately omitting newOwnerId
      result.current({ workspaceId: "w1" })
    ).rejects.toThrow("Please pass a newOwnerId");

    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
