import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useSetSpaceEntityNsfw from "./useSetSpaceEntityNsfw";
import type { Entity } from "../../interfaces/models/Entity";
import type { Space } from "../../interfaces/models/Space";

afterEach(() => {
  resetAxiosMocks();
});

/**
 * NSFW flagging surface (Phase 5, Task 5.2). Asserts the space-mod NSFW hook
 * issues a request to the exact server route
 * `.../spaces/:spaceId/entities/:entityId/nsfw`, and (type-level) that the
 * Entity/Space model interfaces carry the new nsfw/nsfwEffective fields.
 */
describe("useSetSpaceEntityNsfw", () => {
  it("patches /:projectId/spaces/:spaceId/entities/:entityId/nsfw with { nsfw }", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useSetSpaceEntityNsfw(),
    );

    axiosPrivate.mockResponse("patch", {
      message: "Entity NSFW flag updated.",
      nsfw: true,
    });

    let returned;
    await act(async () => {
      returned = await result.current({
        spaceId: "space-1",
        entityId: "entity-1",
        nsfw: true,
      });
    });

    expect(returned).toEqual({
      message: "Entity NSFW flag updated.",
      nsfw: true,
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe(
      "/test-project/spaces/space-1/entities/entity-1/nsfw",
    );
    expect(call.body).toEqual({ nsfw: true });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useSetSpaceEntityNsfw(),
    );

    axiosPrivate.mockError("patch", 403, { message: "Forbidden" });

    await expect(
      result.current({ spaceId: "space-1", entityId: "entity-1", nsfw: true }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("throws before making a request when required fields are missing", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useSetSpaceEntityNsfw(),
    );

    await expect(
      result.current({ spaceId: "", entityId: "entity-1", nsfw: true }),
    ).rejects.toThrow("spaceId and entityId are required.");
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});

// Compile-time guards for the mirrored model fields — if a field is dropped or
// mistyped, `vitest`/`tsc` fails to compile this file.
describe("NSFW model interface fields (type-level)", () => {
  it("Entity exposes nsfw + nsfwEffective as booleans", () => {
    const e = {} as Entity;
    const nsfw: boolean | undefined = e.nsfw;
    const eff: boolean | undefined = e.nsfwEffective;
    expect([nsfw, eff]).toBeDefined();
  });

  it("Space exposes nsfw + nsfwEffective as booleans", () => {
    const s = {} as Space;
    const nsfw: boolean | undefined = s.nsfw;
    const eff: boolean | undefined = s.nsfwEffective;
    expect([nsfw, eff]).toBeDefined();
  });
});
