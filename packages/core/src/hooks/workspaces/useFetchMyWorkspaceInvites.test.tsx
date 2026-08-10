import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useFetchMyWorkspaceInvites from "./useFetchMyWorkspaceInvites";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchMyWorkspaceInvites", () => {
  it("gets /me/workspace-invites with no params (matched by token server-side)", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchMyWorkspaceInvites(),
      { projectId: "project-1", user }
    );

    const envelope = { data: [{ id: "i1" }] };
    axiosPrivate.mockResponse("get", envelope);

    let returned: { data: unknown[] } | undefined;
    await act(async () => {
      returned = await result.current();
    });

    expect(returned).toEqual(envelope);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/project-1/me/workspace-invites");
    // No config/params — the actor is the token user (no userId leak).
    expect(call.config).toBeUndefined();
  });

  it("throws before requesting when there is no projectId", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchMyWorkspaceInvites(),
      { projectId: "", user }
    );

    await expect(result.current()).rejects.toThrow("No projectId available.");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
