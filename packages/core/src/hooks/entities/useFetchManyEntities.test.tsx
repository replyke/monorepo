import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeEntity } from "../../test-utils";
import useFetchManyEntities from "./useFetchManyEntities";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Entity } from "../../interfaces/models/Entity";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(entities: Entity[]): PaginatedResponse<Entity> {
  return {
    data: entities,
    pagination: { page: 1, pageSize: 10, totalPages: 1, totalItems: entities.length, hasMore: false },
  };
}

describe("useFetchManyEntities", () => {
  it("fetches a page of entities with the expected params", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyEntities());

    const page = makePage([makeEntity()]);
    axiosPrivate.mockResponse("get", page);

    let returned: PaginatedResponse<Entity> | undefined;
    await act(async () => {
      returned = await result.current({ page: 1, sortBy: "new" });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/entities");
    expect(call.config?.params).toMatchObject({ page: 1, sortBy: "new" });
  });

  it("serializes keywordsFilters into bracket-notation params", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyEntities());

    axiosPrivate.mockResponse("get", makePage([]));

    await act(async () => {
      await result.current({
        keywordsFilters: { includes: ["news", "tech"], doesNotInclude: ["spam"] },
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({
      "keywordsFilters[includes][0]": "news",
      "keywordsFilters[includes][1]": "tech",
      "keywordsFilters[doesNotInclude][0]": "spam",
    });
  });

  it("serializes locationFilters into bracket-notation params", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyEntities());

    axiosPrivate.mockResponse("get", makePage([]));

    await act(async () => {
      await result.current({
        locationFilters: { latitude: 40.7128, longitude: -74.006, radius: 10 },
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({
      "locationFilters[latitude]": 40.7128,
      "locationFilters[longitude]": -74.006,
      "locationFilters[radius]": 10,
    });
  });

  it("forwards the blockedFilter opt-in param to the request", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyEntities());

    axiosPrivate.mockResponse("get", makePage([]));

    await act(async () => {
      await result.current({ blockedFilter: "include-outbound-blocked" });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toMatchObject({
      blockedFilter: "include-outbound-blocked",
    });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useFetchManyEntities());

    axiosPrivate.mockError("get", 500, { message: "Internal error" });

    await expect(result.current()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyEntities(),
      { projectId: "" },
    );

    await expect(result.current()).rejects.toThrow("No projectId available.");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
