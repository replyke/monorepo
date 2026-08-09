import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useFetchManyWorkspacesWrapper from "./useFetchManyWorkspacesWrapper";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Workspace } from "../../interfaces/models/Workspace";

afterEach(() => {
  resetAxiosMocks();
});

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Acme",
    metadata: {},
    ownerId: "user-1",
    parentWorkspaceId: null,
    depth: 0,
    inheritsFromParent: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePage(
  workspaces: Workspace[],
  hasMore: boolean
): PaginatedResponse<Workspace> {
  return {
    data: workspaces,
    pagination: {
      page: 1,
      pageSize: 10,
      totalPages: hasMore ? 2 : 1,
      totalItems: workspaces.length,
      hasMore,
    },
  };
}

describe("useFetchManyWorkspacesWrapper", () => {
  it("fetches the first page on mount and loads more on demand", async () => {
    const first = makeWorkspace({ id: "w1" });
    const second = makeWorkspace({ id: "w2" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyWorkspacesWrapper({ limit: 10 }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", makePage([first], true)),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.workspaces).toEqual([first]);
    expect(result.current.hasMore).toBe(true);

    axiosPrivate.mockResponse("get", makePage([second], false));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(result.current.workspaces).toEqual([first, second]);

    const calls = axiosPrivate.calls("get");
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("/test-project/workspaces");
    expect(calls[0].config?.params).toMatchObject({ page: 1, limit: 10 });
    expect(calls[1].config?.params).toMatchObject({ page: 2, limit: 10 });
    // Actor derived from the token — never a userId param.
    expect(calls[0].config?.params).not.toHaveProperty("userId");
  });

  it("forwards the include param on every page fetch", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyWorkspacesWrapper({ include: "memberCount" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", makePage([], false)),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({ include: "memberCount" });
  });

  it("stops loading without throwing when the request fails", async () => {
    const { result } = renderHookWithAxios(
      () => useFetchManyWorkspacesWrapper({}),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockError("get", 500, { message: "Internal error" }),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.workspaces).toEqual([]);
  });
});
