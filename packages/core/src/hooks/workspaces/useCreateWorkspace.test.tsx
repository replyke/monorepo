import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
} from "../../test-utils";
import useCreateWorkspace from "./useCreateWorkspace";
import type { Workspace } from "../../interfaces/models/Workspace";

afterEach(() => {
  resetAxiosMocks();
});

describe("useCreateWorkspace", () => {
  it("posts the workspace to the project-scoped route and returns it", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspace(),
      { projectId: "project-1", user }
    );

    const created: Partial<Workspace> = { id: "w1", name: "Acme" };
    axiosPrivate.mockResponse("post", created, 201);

    let returned: Workspace | undefined;
    await act(async () => {
      returned = await result.current({
        name: "Acme",
        parentWorkspaceId: "w-parent",
      });
    });

    expect(returned).toEqual(created);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/project-1/workspaces");
    expect(call.body).toEqual({ name: "Acme", parentWorkspaceId: "w-parent" });
    // Actor derived from the token — no userId in the body.
    expect(call.body).not.toHaveProperty("userId");
  });

  it("does not forward an actor userId in the body", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockResponse("post", { id: "w1" }, 201);

    await act(async () => {
      await result.current({
        name: "Acme",
        // @ts-expect-error a body userId here is the ACTOR (act-as-user) — node-sdk-only
        userId: "someone-else",
      });
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.body).toEqual({ name: "Acme" });
    expect(call.body).not.toHaveProperty("userId");
  });

  it("throws before making a request when the workspace name is missing", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspace(),
      { projectId: "project-1", user }
    );

    await expect(
      // @ts-expect-error deliberately omitting the required name
      result.current({})
    ).rejects.toThrow("Workspace name is required");

    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateWorkspace(),
      { projectId: "project-1", user }
    );

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    await expect(result.current({ name: "Acme" })).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
