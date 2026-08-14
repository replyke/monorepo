import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeSpaceDetailed } from "../../test-utils";
import useSpaceData from "./useSpaceData";

afterEach(() => {
  resetAxiosMocks();
});

// Any space with a resolved `id` (whether fetched or passed in directly via
// the `space` prop) triggers a breadcrumb GET on mount — so every render
// below needs that response queued via `beforeRender`, even when no main
// space-fetch call is expected.
function mockBreadcrumb(axiosPrivate: { mockResponse: (m: "get", d: unknown) => void }) {
  axiosPrivate.mockResponse("get", { breadcrumb: [], depth: 0 });
}

describe("useSpaceData", () => {
  it("resolves a space by spaceId and fetches its breadcrumb", async () => {
    const space = makeSpaceDetailed({ id: "space-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSpaceData({ spaceId: "space-1" }),
      {
        beforeRender: ({ axiosPrivate }) => {
          axiosPrivate.mockResponse("get", space); // fetchSpace
          mockBreadcrumb(axiosPrivate); // fetchSpaceBreadcrumb
        },
      },
    );

    await waitFor(() => expect(result.current.space).toEqual(space));
    expect(result.current.loading).toBe(false);

    const [spaceCall, breadcrumbCall] = axiosPrivate.calls("get");
    expect(spaceCall.url).toBe("/test-project/spaces/space-1");
    expect(breadcrumbCall.url).toBe("/test-project/spaces/space-1/breadcrumb");
  });

  it("uses a directly-provided space prop without a main fetch", async () => {
    const space = makeSpaceDetailed({ id: "space-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSpaceData({ space }),
      { beforeRender: ({ axiosPrivate }) => mockBreadcrumb(axiosPrivate) },
    );

    expect(result.current.space).toEqual(space);
    await waitFor(() => expect(axiosPrivate.calls("get")).toHaveLength(1));
    expect(axiosPrivate.calls("get")[0].url).toBe(
      "/test-project/spaces/space-1/breadcrumb",
    );
  });

  it("computes permission flags from the resolved space's memberPermissions", async () => {
    const space = makeSpaceDetailed({
      id: "space-1",
      memberPermissions: {
        isAdmin: true,
        isModerator: false,
        isMember: true,
        status: "active",
        canPost: true,
        canModerate: true,
        canRead: true,
      },
    });

    const { result } = renderHookWithAxios(
      () => useSpaceData({ space }),
      { beforeRender: ({ axiosPrivate }) => mockBreadcrumb(axiosPrivate) },
    );

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canModerate).toBe(true);
    expect(result.current.membershipStatus).toBe("active");
  });

  it("does not throw and leaves space unset when the fetch fails", async () => {
    // The effect re-runs once after the first failure (its deps include
    // `space`, which goes from undefined to null) before settling — so two
    // error responses must be queued, or the second call falls through to
    // the real, un-mocked axios method.
    const { result } = renderHookWithAxios(
      () => useSpaceData({ spaceId: "space-1" }),
      {
        beforeRender: ({ axiosPrivate }) => {
          axiosPrivate.mockError("get", 500, { message: "Internal error" });
          axiosPrivate.mockError("get", 500, { message: "Internal error" });
        },
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.space).toBeNull();
    expect(result.current.error).toBe("Failed to fetch space");
  });

  it("joins the space and optimistically updates membership/member count", async () => {
    const space = makeSpaceDetailed({ id: "space-1", membersCount: 5, memberPermissions: null });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSpaceData({ space }),
      { beforeRender: ({ axiosPrivate }) => mockBreadcrumb(axiosPrivate) },
    );
    await waitFor(() => expect(axiosPrivate.calls("get")).toHaveLength(1));

    axiosPrivate.mockResponse("post", {
      message: "Joined",
      membership: { id: "membership-1", spaceId: "space-1", userId: "user-1", role: "member", status: "active", joinedAt: "2024-01-01T00:00:00.000Z" },
    });

    await act(async () => {
      await result.current.joinSpace();
    });

    expect(result.current.space?.membersCount).toBe(6);
    expect(result.current.isMember).toBe(true);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/spaces/space-1/join");
  });

  it("leaves the space and clears membership/decrements member count", async () => {
    const space = makeSpaceDetailed({
      id: "space-1",
      membersCount: 5,
      memberPermissions: {
        isAdmin: false,
        isModerator: false,
        isMember: true,
        status: "active",
        canPost: true,
        canModerate: false,
        canRead: true,
      },
    });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSpaceData({ space }),
      { beforeRender: ({ axiosPrivate }) => mockBreadcrumb(axiosPrivate) },
    );
    await waitFor(() => expect(axiosPrivate.calls("get")).toHaveLength(1));

    axiosPrivate.mockResponse("delete", { message: "Left" });

    await act(async () => {
      await result.current.leaveSpace();
    });

    expect(result.current.space?.membersCount).toBe(4);
    expect(result.current.isMember).toBe(false);

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/test-project/spaces/space-1/leave");
  });

  it("updates the space via updateSpace", async () => {
    const space = makeSpaceDetailed({ id: "space-1", name: "Old" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSpaceData({ space }),
      { beforeRender: ({ axiosPrivate }) => mockBreadcrumb(axiosPrivate) },
    );
    await waitFor(() => expect(axiosPrivate.calls("get")).toHaveLength(1));

    const updated = { ...space, name: "New" };
    axiosPrivate.mockResponse("patch", updated);

    let returned;
    await act(async () => {
      returned = await result.current.updateSpace({ update: { name: "New" } });
    });

    expect(returned).toEqual(updated);
    expect(result.current.space?.name).toBe("New");
  });

  it("deletes the space via deleteSpace and clears local state", async () => {
    const space = makeSpaceDetailed({ id: "space-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useSpaceData({ space }),
      { beforeRender: ({ axiosPrivate }) => mockBreadcrumb(axiosPrivate) },
    );
    await waitFor(() => expect(axiosPrivate.calls("get")).toHaveLength(1));

    axiosPrivate.mockResponse("delete", {
      message: "Space deleted successfully.",
    });

    await act(async () => {
      await result.current.deleteSpace();
    });

    expect(result.current.space).toBeUndefined();
  });
});
