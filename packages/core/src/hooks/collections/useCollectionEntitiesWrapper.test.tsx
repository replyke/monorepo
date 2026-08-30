import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderHookWithStore,
  stubFetchMock,
  unstubFetchMock,
  jsonResponse,
  makeAuthUser,
  type FetchMockHandle,
} from "../../test-utils";
import { setUser } from "../../store/slices/authSlice";
import useCollectionEntitiesWrapper from "./useCollectionEntitiesWrapper";
import type { Entity } from "../../interfaces/models/Entity";

let fetchHandle: FetchMockHandle;

const makeEntity = (id: string): Entity => ({ id } as Entity);

function paginated(data: Entity[], hasMore: boolean) {
  return jsonResponse({
    data,
    pagination: { page: 1, pageSize: 20, totalPages: hasMore ? 2 : 1, totalItems: data.length, hasMore },
  });
}

beforeEach(() => {
  fetchHandle = stubFetchMock(async () => jsonResponse({}, 404));
});

afterEach(() => {
  cleanup();
  unstubFetchMock();
});

describe("useCollectionEntitiesWrapper", () => {
  it("fetches page 1 for the given collectionId on mount", async () => {
    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("e1"), makeEntity("e2")], true));

    const { result } = renderHookWithStore(() =>
      useCollectionEntitiesWrapper({ collectionId: "col-1" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entities.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(result.current.hasMore).toBe(true);

    const call = fetchHandle.calls()[0];
    const url = new URL(call.url);
    expect(url.pathname).toContain("/test-project/collections/col-1/entities");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("sortBy")).toBe("added");
    expect(url.searchParams.get("sortDir")).toBe("desc");
  });

  it("falls back to the current collection from useCollections when collectionId is omitted", async () => {
    fetchHandle.fetchMock.mockImplementation(async (...args: unknown[]) => {
      const req = args[0] as Request | string;
      const url = typeof req === "string" ? req : req.url;
      if (url.includes("/collections/root/entities")) {
        return paginated([makeEntity("e1")], false);
      }
      if (url.endsWith("/collections/root")) {
        return jsonResponse({
          id: "root",
          projectId: "test-project",
          userId: "user-1",
          parentId: null,
          name: "Root",
          entityCount: 0,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        });
      }
      if (url.includes("/sub-collections")) {
        return jsonResponse([]);
      }
      return jsonResponse({}, 404);
    });

    const { result, store } = renderHookWithStore(() => useCollectionEntitiesWrapper({}));
    store.dispatch(setUser(makeAuthUser()));

    await waitFor(() => expect(result.current.entities.map((e) => e.id)).toEqual(["e1"]));
  });

  it("loadMore appends the next page and stops once hasMore is false", async () => {
    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("e1")], true));
    const { result } = renderHookWithStore(() =>
      useCollectionEntitiesWrapper({ collectionId: "col-1", limit: 1 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("e2")], false));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.entities.map((e) => e.id)).toEqual(["e1", "e2"]));
    expect(result.current.hasMore).toBe(false);

    const pageCall = fetchHandle.calls().find((c) => new URL(c.url).searchParams.get("page") === "2");
    expect(pageCall).toBeTruthy();

    // A further loadMore is a no-op since hasMore is now false.
    act(() => result.current.loadMore());
    expect(fetchHandle.calls()).toHaveLength(2);
  });

  it("setSortBy/setSortDir reset to page 1 and refetch", async () => {
    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("e1")], false));
    const { result } = renderHookWithStore(() =>
      useCollectionEntitiesWrapper({ collectionId: "col-1" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("top-1")], false));
    act(() => result.current.setSortBy("top"));
    await waitFor(() => expect(result.current.entities.map((e) => e.id)).toEqual(["top-1"]));

    const calls = fetchHandle.calls();
    const call = calls[calls.length - 1];
    expect(new URL(call!.url).searchParams.get("sortBy")).toBe("top");
  });

  it("surfaces a failed fetch by leaving entities empty and loading false", async () => {
    fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({ message: "boom" }, 500));
    const { result } = renderHookWithStore(() =>
      useCollectionEntitiesWrapper({ collectionId: "col-1" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entities).toEqual([]);
  });

  it("refetch re-runs the page-1 query", async () => {
    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("e1")], false));
    const { result } = renderHookWithStore(() =>
      useCollectionEntitiesWrapper({ collectionId: "col-1" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    fetchHandle.fetchMock.mockResolvedValueOnce(paginated([makeEntity("e1-refreshed")], false));
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() =>
      expect(result.current.entities.map((e) => e.id)).toEqual(["e1-refreshed"]),
    );
  });
});
