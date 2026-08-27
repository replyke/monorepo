import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeReputationGrant,
} from "../../test-utils";
import useFetchManyReputationGrants, {
  type FetchManyReputationGrantsResponse,
} from "./useFetchManyReputationGrants";
import type { ReputationGrant } from "../../interfaces/models/ReputationGrant";

afterEach(() => {
  resetAxiosMocks();
});

function makePage(
  grants: ReputationGrant[],
  extra: Partial<FetchManyReputationGrantsResponse> = {}
): FetchManyReputationGrantsResponse {
  return {
    data: grants,
    pagination: {
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalItems: grants.length,
      hasMore: false,
    },
    ...extra,
  };
}

describe("useFetchManyReputationGrants", () => {
  it("gets /:projectId/reputation-grants with the recipient filter", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    const page = makePage([makeReputationGrant()]);
    axiosPrivate.mockResponse("get", page);

    let returned: FetchManyReputationGrantsResponse | undefined;
    await act(async () => {
      returned = await result.current({
        recipientId: "user-2",
        page: 2,
        limit: 25,
      });
    });

    expect(returned).toEqual(page);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/reputation-grants");
    expect(call.config?.params).toEqual({
      page: 2,
      limit: 25,
      recipientId: "user-2",
    });
  });

  it("joins an include array and forwards the space-reputation params", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    axiosPrivate.mockResponse("get", makePage([]));

    await act(async () => {
      await result.current({
        senderId: "user-1",
        include: ["user"],
        spaceReputation: { spaceId: "context" },
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toEqual({
      senderId: "user-1",
      include: "user",
      spaceReputationId: "context",
    });
  });

  it("flattens the spaceReputation object rather than sending it nested", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    axiosPrivate.mockResponse("get", makePage([]));

    await act(async () => {
      await result.current({
        senderId: "user-1",
        spaceReputation: { spaceId: "space-1", includeDescendants: true },
      });
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toEqual({
      senderId: "user-1",
      spaceReputationId: "space-1",
      spaceReputationDescendants: true,
    });
    expect(call.config?.params).not.toHaveProperty("spaceReputation");
  });

  it("returns the summary block on the target filter shape", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    axiosPrivate.mockResponse(
      "get",
      makePage([makeReputationGrant()], {
        summary: { total: 120, count: 3, viewerTotal: 20 },
      })
    );

    let returned: FetchManyReputationGrantsResponse | undefined;
    await act(async () => {
      returned = await result.current({
        targetType: "chat-message",
        targetId: "message-1",
      });
    });

    expect(returned?.summary).toEqual({
      total: 120,
      count: 3,
      viewerTotal: 20,
    });

    const [call] = axiosPrivate.calls("get");
    expect(call.config?.params).toEqual({
      targetType: "chat-message",
      targetId: "message-1",
    });
  });

  it("throws before making a request when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useFetchManyReputationGrants(),
      { projectId: "" }
    );

    await expect(result.current({ recipientId: "user-2" })).rejects.toThrow(
      "No projectId available."
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when no filter is supplied", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    await expect(result.current()).rejects.toThrow("One filter is required");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when two filter shapes are combined", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    await expect(
      result.current({ recipientId: "user-2", senderId: "user-1" })
    ).rejects.toThrow("Filters are mutually exclusive");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("throws before making a request when only one half of the target is supplied", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    await expect(
      // @ts-expect-error a half-filled target does not typecheck — the runtime
      // throw is the defense for plain-JS callers, who get no type checking at
      // all. This directive is also the type-level assertion: it fails the
      // build if the props ever stop being a both-or-neither union.
      result.current({ targetId: "entity-1" })
    ).rejects.toThrow("targetType and targetId must be supplied together.");
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });

  it("rejects an explicit null target at compile time — the empty branch is undefined, not null", async () => {
    // COMPILE-TIME assertion, matching the SDK write props: the server's
    // `targetType`/`targetId` are `.optional()` with NO `.nullable()`, so this
    // leaf hook — the one that actually shapes the query — uses the strict
    // `ReputationGrantTargetFilter` whose empty branch is `?: undefined`. The
    // directives go unused, failing the build, if anyone widens it to
    // `?: null`. The stateful WRAPPER around this hook is the deliberate
    // exception (React props, not a wire body) and has its own positive test.
    //
    // Nothing throws at runtime: both halves are falsy, so the both-or-neither
    // guard sees "neither", the recipient filter stands alone, and the target
    // keys are simply never added to the params. The type is the only thing
    // that catches the mistake, which is why it is pinned.
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    axiosPrivate.mockResponse("get", makePage([makeReputationGrant()]));
    await act(async () => {
      await result.current({
        recipientId: "user-2",
        // @ts-expect-error the target pair is not nullable — omit both keys.
        targetType: null,
        // @ts-expect-error the target pair is not nullable — omit both keys.
        targetId: null,
      });
    });

    expect(axiosPrivate.calls("get")).toHaveLength(1);
    expect(axiosPrivate.calls("get")[0].config?.params).toEqual({
      recipientId: "user-2",
    });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchManyReputationGrants()
    );

    axiosPrivate.mockError("get", 403, {
      code: "database/tables-not-available",
    });

    await expect(result.current({ recipientId: "user-2" })).rejects.toMatchObject(
      { response: { status: 403 } }
    );
  });
});
