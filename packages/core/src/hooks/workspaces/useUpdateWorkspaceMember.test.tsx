import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useUpdateWorkspaceMember from "./useUpdateWorkspaceMember";

afterEach(() => {
  resetAxiosMocks();
});

describe("useUpdateWorkspaceMember", () => {
  it("puts both ids in the path and sends only the editable fields as the body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspaceMember(),
      { projectId: "project-1", user }
    );

    const member = { id: "m1", userId: "user-2", rank: 4 };
    axiosPrivate.mockResponse("patch", member);

    let returned: typeof member | undefined;
    await act(async () => {
      returned = await result.current({
        workspaceId: "w1",
        targetUserId: "user-2",
        capabilities: ["invite", "remove-member"],
        permissions: ["billing:read"],
        rank: 4,
        title: "Manager",
        metadata: { team: "ops" },
      });
    });

    expect(returned).toEqual(member);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/project-1/workspaces/w1/members/user-2");
    expect(call.body).toEqual({
      capabilities: ["invite", "remove-member"],
      permissions: ["billing:read"],
      rank: 4,
      title: "Manager",
      metadata: { team: "ops" },
    });
    // Both ids are path params — neither belongs in the body.
    expect(call.body).not.toHaveProperty("workspaceId");
    expect(call.body).not.toHaveProperty("targetUserId");
  });

  it("throws before requesting when workspaceId or targetUserId is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useUpdateWorkspaceMember(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting workspaceId
      result.current({ targetUserId: "user-2", rank: 1 })
    ).rejects.toThrow("Please pass a workspaceId");

    await expect(
      // @ts-expect-error deliberately omitting targetUserId
      result.current({ workspaceId: "w1", rank: 1 })
    ).rejects.toThrow("Please pass a targetUserId");

    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
