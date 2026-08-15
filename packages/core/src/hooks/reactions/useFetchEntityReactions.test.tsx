import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeReaction } from "../../test-utils";
import useFetchEntityReactions from "./useFetchEntityReactions";
import type { Reaction } from "../../interfaces/models/Reaction";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(reactions: Reaction[]): PaginatedResponse<Reaction> {
  return {
    data: reactions,
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalItems: reactions.length, hasMore: false },
  };
}

describe("useFetchEntityReactions", () => {
  it("fetches a page of reactions for an entity", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchEntityReactions());

    const page = makePage([makeReaction()]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<Reaction> | undefined;
    await act(async () => {
      returned = await result.current({ entityId: "entity-1", page: 1 });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/entities/entity-1/reactions");
    expect(call.config?.params).toMatchObject({ page: 1, limit: 20, sortDir: "desc" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchEntityReactions());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(
      result.current({ entityId: "entity-1", page: 1 }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when limit is 0", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchEntityReactions());

    await expect(
      result.current({ entityId: "entity-1", page: 1, limit: 0 }),
    ).rejects.toThrow("Can't fetch with limit 0");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when no entity ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchEntityReactions());

    await expect(
      result.current({ entityId: "", page: 1 }),
    ).rejects.toThrow("No entity ID provided");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
