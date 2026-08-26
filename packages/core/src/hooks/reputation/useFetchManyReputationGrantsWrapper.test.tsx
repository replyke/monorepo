import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeReputationGrant,
} from "../../test-utils";
import useFetchManyReputationGrantsWrapper from "./useFetchManyReputationGrantsWrapper";
import type { FetchManyReputationGrantsResponse } from "./useFetchManyReputationGrants";
import type { ReputationGrant } from "../../interfaces/models/ReputationGrant";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(
  grants: ReputationGrant[],
  hasMore: boolean,
  extra: Partial<FetchManyReputationGrantsResponse> = {}
): FetchManyReputationGrantsResponse {
  return {
    data: grants,
    pagination: {
      page: 1,
      pageSize: 10,
      totalPages: hasMore ? 2 : 1,
      totalItems: grants.length,
      hasMore,
    },
    ...extra,
  };
}

describe("useFetchManyReputationGrantsWrapper", () => {
  it("fetches the first page on mount and loads more on demand, carrying every filter to both pages", async () => {
    const first = makeReputationGrant({ id: "grant-1" });
    const second = makeReputationGrant({ id: "grant-2" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () =>
        useFetchManyReputationGrantsWrapper({
          recipientId: "user-2",
          include: ["user"],
          limit: 10,
        }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", makePage([first], true)),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.grants).toEqual([first]);
    expect(result.current.hasMore).toBe(true);

    axiosPrivate.mockResponse("get", makePage([second], false));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(result.current.grants).toEqual([first, second]);

    const calls = axiosPrivate.calls("get");
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("/test-project/reputation-grants");
    // The single buildParams memo feeds both paths: page 2 carries the exact
    // same filters as page 1.
    expect(calls[0].config?.params).toEqual({
      page: 1,
      limit: 10,
      recipientId: "user-2",
      include: "user",
    });
    expect(calls[1].config?.params).toEqual({
      page: 2,
      limit: 10,
      recipientId: "user-2",
      include: "user",
    });
  });

  it("exposes the summary block on the target filter shape", async () => {
    const { result } = renderHookWithAxios(
      () =>
        useFetchManyReputationGrantsWrapper({
          targetType: "entity",
          targetId: "entity-1",
        }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse(
            "get",
            makePage([makeReputationGrant()], false, {
              summary: { total: 90, count: 4, viewerTotal: 10 },
            })
          ),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toEqual({
      total: 90,
      count: 4,
      viewerTotal: 10,
    });
  });

  it("resets to page 1 when a filter changes", async () => {
    const { result, axiosPrivate, rerender } = renderHookWithAxios(
      ({ recipientId }: { recipientId: string }) =>
        useFetchManyReputationGrantsWrapper({ recipientId }),
      {
        initialProps: { recipientId: "user-2" },
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", makePage([makeReputationGrant()], false)),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    axiosPrivate.mockResponse("get", makePage([], false));
    rerender({ recipientId: "user-3" });

    await waitFor(() => {
      const calls = axiosPrivate.calls("get");
      expect(calls[calls.length - 1].config?.params).toEqual({
        page: 1,
        limit: 10,
        recipientId: "user-3",
      });
    });
  });

  it("does not re-fetch on re-render when include and spaceReputation are inline literals", async () => {
    // Both are almost always written inline at the call site, so a fresh
    // reference every render would re-arm the reset effect forever.
    const { result, axiosPrivate, rerender } = renderHookWithAxios(
      () =>
        useFetchManyReputationGrantsWrapper({
          recipientId: "user-2",
          include: ["user"],
          spaceReputation: { spaceId: "context" },
        }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockResponse("get", makePage([makeReputationGrant()], false)),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender();
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(axiosPrivate.calls("get")).toHaveLength(1);
    expect(axiosPrivate.calls("get")[0].config?.params).toEqual({
      page: 1,
      limit: 10,
      recipientId: "user-2",
      include: "user",
      spaceReputationId: "context",
    });
  });

  it("stays idle — no request at all — when no filter is supplied", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrantsWrapper({})
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(axiosPrivate.calls("get")).toHaveLength(0);
    expect(result.current.grants).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it("stays idle when two filter shapes are combined", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrantsWrapper({
        recipientId: "user-2",
        senderId: "user-1",
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
