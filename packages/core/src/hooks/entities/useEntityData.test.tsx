import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeEntity } from "../../test-utils";
import useEntityData, { type UseEntityDataProps } from "./useEntityData";

afterEach(() => {
  resetAxiosMocks();
});

describe("useEntityData", () => {
  it("resolves an entity by entityId and caches it for the same ID on a later render", async () => {
    const entityOne = makeEntity({ id: "entity-1" });
    const entityTwo = makeEntity({ id: "entity-2" });

    const { result, rerender, axiosPrivate } = renderHookWithAxios(
      (props: UseEntityDataProps) => useEntityData(props),
      {
        initialProps: { entityId: "entity-1" } as UseEntityDataProps,
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", entityOne),
      },
    );

    await waitFor(() => expect(result.current.entity).toEqual(entityOne));

    axiosPrivate.mockResponse("get", entityTwo);
    rerender({ entityId: "entity-2" } as UseEntityDataProps);
    await waitFor(() => expect(result.current.entity).toEqual(entityTwo));

    rerender({ entityId: "entity-1" } as UseEntityDataProps);
    await waitFor(() => expect(result.current.entity).toEqual(entityOne));

    // Only 2 GET calls total: the cached entity-1 lookup on the 3rd render
    // didn't trigger a 3rd request.
    expect(axiosPrivate.calls("get")).toHaveLength(2);
  });

  it("resolves an entity by foreignId, passing createIfNotFound through", async () => {
    const entity = makeEntity({ foreignId: "ext-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useEntityData({ foreignId: "ext-1", createIfNotFound: true }),
      {
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", entity),
      },
    );

    await waitFor(() => expect(result.current.entity).toEqual(entity));

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/entities/by-foreign-id");
    expect(call.config?.params).toMatchObject({
      foreignId: "ext-1",
      createIfNotFound: true,
    });
  });

  it("resolves an entity by shortId", async () => {
    const entity = makeEntity({ shortId: "short-1" });

    const { result, axiosPrivate } = renderHookWithAxios(
      () => useEntityData({ shortId: "short-1" }),
      {
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", entity),
      },
    );

    await waitFor(() => expect(result.current.entity).toEqual(entity));

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/entities/by-short-id");
  });

  it("uses a directly-provided entity prop without fetching", async () => {
    const entity = makeEntity({ id: "entity-1" });

    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useEntityData({ entity }),
    );

    expect(result.current.entity).toEqual(entity);
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("does not throw and leaves entity unset when the fetch fails", async () => {
    const { result } = renderHookWithAxios(
      () => useEntityData({ entityId: "entity-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockError("get", 500, { message: "Internal error" }),
      },
    );

    await waitFor(() => expect(result.current.entity).toBeUndefined());
  });

  it("updates the entity via updateEntity", async () => {
    const entity = makeEntity({ id: "entity-1", title: "Old" });

    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useEntityData({ entity }),
    );

    const updated = { ...entity, title: "New" };
    axiosPrivate.mockResponse("patch", updated);

    let returned;
    await act(async () => {
      returned = await result.current.updateEntity({ update: { title: "New" } });
    });

    expect(returned).toEqual(updated);
    expect(result.current.entity).toEqual(updated);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/test-project/entities/entity-1");
    expect(call.body).toMatchObject({ title: "New" });
  });

  it("no-ops updateEntity when there is no entity yet", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useEntityData({} as UseEntityDataProps),
    );

    let returned;
    await act(async () => {
      returned = await result.current.updateEntity({ update: { title: "New" } });
    });

    expect(returned).toBeUndefined();
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });

  it("deletes the entity via deleteEntity and clears local state", async () => {
    const entity = makeEntity({ id: "entity-1" });

    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useEntityData({ entity }),
    );

    axiosPrivate.mockResponse("delete", undefined, 204);

    await act(async () => {
      await result.current.deleteEntity();
    });

    expect(result.current.entity).toBeUndefined();

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/test-project/entities/entity-1");
  });

  it("does not throw when deleteEntity's request fails", async () => {
    const entity = makeEntity({ id: "entity-1" });

    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useEntityData({ entity }),
    );

    axiosPrivate.mockError("delete", 500, { message: "Internal error" });

    await expect(
      act(async () => {
        await result.current.deleteEntity();
      }),
    ).resolves.not.toThrow();
  });
});
