import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeReputationGrant,
} from "../../test-utils";
import useCreateReputationGrant from "./useCreateReputationGrant";
import type { ReputationGrant } from "../../interfaces/models/ReputationGrant";

afterEach(() => {
  resetAxiosMocks();
});

describe("useCreateReputationGrant", () => {
  it("posts to /:projectId/reputation-grants with the server's exact field names", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    const grant = makeReputationGrant({ amount: 25 });
    axiosPrivate.mockResponse("post", grant, 201);

    let returned: ReputationGrant | undefined;
    await act(async () => {
      returned = await result.current({
        recipientId: "user-2",
        amount: 25,
        spaceId: "space-1",
        note: "great answer",
        metadata: { source: "answer-card" },
        targetType: "comment",
        targetId: "comment-1",
      });
    });

    expect(returned).toEqual(grant);

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/reputation-grants");
    expect(call.body).toEqual({
      recipientId: "user-2",
      amount: 25,
      spaceId: "space-1",
      note: "great answer",
      metadata: { source: "answer-card" },
      targetType: "comment",
      targetId: "comment-1",
    });
  });

  it("never sends actingUserId — the sender comes from the user token", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    axiosPrivate.mockResponse("post", makeReputationGrant(), 201);

    await act(async () => {
      await result.current({ recipientId: "user-2", amount: 5 });
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.body).not.toHaveProperty("actingUserId");
  });

  it("pins the nullability contract: note/spaceId accept null, metadata does not", async () => {
    // COMPILE-TIME assertions — the runtime call is incidental. The server's
    // shared `metadataSchema` is `z.record(...).optional()` with NO
    // `.nullable()`, while `note` and `spaceId` are `.nullable().optional()`.
    // The `@ts-expect-error` below fails the typecheck if anyone re-adds
    // `| null` to `metadata`, which would hand callers a shape the server
    // answers with 400 reputation-grant/invalid-body.
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    axiosPrivate.mockResponse("post", makeReputationGrant(), 201);

    await act(async () => {
      await result.current({
        recipientId: "user-2",
        amount: 5,
        // Both genuinely nullable server-side.
        spaceId: null,
        note: null,
        // @ts-expect-error metadata is not nullable — omit the key instead.
        metadata: null,
      });
    });

    expect(axiosPrivate.calls("post")).toHaveLength(1);
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateReputationGrant(),
      { projectId: "" }
    );

    await expect(
      result.current({ recipientId: "user-2", amount: 5 })
    ).rejects.toThrow("No projectId available.");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("throws before making a request when recipientId is missing", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    await expect(
      result.current({ amount: 5 } as never)
    ).rejects.toThrow("recipientId is required.");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("throws before making a request when amount is missing", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    await expect(
      result.current({ recipientId: "user-2" } as never)
    ).rejects.toThrow("amount is required.");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("throws before making a request when only one half of the target is supplied", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    await expect(
      result.current({
        recipientId: "user-2",
        amount: 5,
        targetType: "entity",
      })
    ).rejects.toThrow("targetType and targetId must be supplied together.");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReputationGrant()
    );

    axiosPrivate.mockError("post", 409, {
      code: "reputation-grant/insufficient-reputation",
    });

    await expect(
      result.current({ recipientId: "user-2", amount: 5 })
    ).rejects.toMatchObject({ response: { status: 409 } });
  });
});
