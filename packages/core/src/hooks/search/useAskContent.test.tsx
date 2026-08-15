import { describe, it, expect, afterEach, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, makeEntity } from "../../test-utils";
import useAskContent from "./useAskContent";

// Isolate the hook's 403 refresh-retry logic from the auth thunk/store: the
// shared single-flight is exercised in refreshAccessToken's own coverage.
vi.mock("../../config/refreshAccessToken", () => ({
  refreshAccessToken: vi.fn(),
}));
import { refreshAccessToken } from "../../config/refreshAccessToken";
const mockedRefresh = vi.mocked(refreshAccessToken);

afterEach(() => {
  vi.unstubAllGlobals();
  mockedRefresh.mockReset();
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("useAskContent", () => {
  it("streams tokens into the answer and sets sources when the stream completes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeStreamResponse([
        sse("token", { content: "Hello" }),
        sse("token", { content: " world" }),
        sse("sources", [{ sourceType: "entity", similarity: 0.9, record: makeEntity() }]),
        sse("done", {}),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "What is this about?" });
    });

    await waitFor(() => expect(result.current.answer).toBe("Hello world"));
    await waitFor(() => expect(result.current.streaming).toBe(false));

    expect(result.current.sources).toEqual([
      { sourceType: "entity", similarity: 0.9, record: makeEntity() },
    ]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    const [, init] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.sublay.io/v7/test-project/search/ask",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ query: "What is this about?" });
  });

  it("forwards spaceId + includeChildSpaces in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeStreamResponse([sse("done", {})]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello", spaceId: "space-1", includeChildSpaces: true });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      query: "hello",
      spaceId: "space-1",
      includeChildSpaces: true,
    });
  });

  it("opts react-native-fetch-api into incremental streaming via reactNative.textStreaming", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeStreamResponse([sse("done", {})]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [, init] = fetchMock.mock.calls[0];
    expect(init.reactNative).toEqual({ textStreaming: true });
  });

  it("attaches an Authorization header when an access token is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeStreamResponse([sse("done", {})]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent(), {
      accessToken: "token-123",
    });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer token-123");
  });

  it("surfaces a non-OK response as an error without streaming", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Rate limited");
    expect(result.current.streaming).toBe(false);
  });

  it("surfaces an error event emitted mid-stream", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeStreamResponse([
        sse("token", { content: "partial" }),
        sse("error", { error: "Model unavailable" }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.error).toBe("Model unavailable"));
    expect(result.current.streaming).toBe(false);
  });

  it("reset() aborts the in-flight stream and clears state", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedSignal = init.signal as AbortSignal;
      return new Promise(() => {}); // never resolves — simulates an in-flight request
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    act(() => {
      result.current.reset();
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.answer).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.streaming).toBe(false);
  });

  it("refreshes once and retries on a bare 403 (expired token), then streams", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Forbidden", { status: 403 }))
      .mockResolvedValueOnce(
        makeStreamResponse([sse("token", { content: "hi" }), sse("done", {})]),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedRefresh.mockResolvedValue("fresh-token");

    const { result } = renderHookWithAxios(() => useAskContent(), {
      accessToken: "stale-token",
      refreshToken: "r",
    });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.answer).toBe("hi"));
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The retry carries the freshly rotated token.
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer fresh-token",
    );
    expect(result.current.error).toBeNull();
  });

  it("does not refresh on a coded 403 (plan-required) and surfaces the error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Semantic search requires a paid plan",
          code: "project/plan-required",
        }),
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent(), {
      accessToken: "tok",
    });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Semantic search requires a paid plan");
    expect(mockedRefresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes once and retries on a bare 401, then streams", async () => {
    // 401 was previously terminal here, on the reasoning that it meant "no
    // token, nothing to refresh". Wrong whenever a refresh token is present but
    // the access token is not — a failed bootstrap, or the auth gate's ready
    // timeout — where it told a signed-in user they were signed out. It also
    // contradicted the axios interceptor, which treats a bare 401 as
    // refreshable.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        makeStreamResponse([sse("token", { content: "hi" }), sse("done", {})]),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedRefresh.mockResolvedValue("fresh-token");

    // A refresh token but no access token — the failed-bootstrap / ready-timeout
    // shape, where the old code told a signed-in user they were signed out.
    const { result } = renderHookWithAxios(() => useAskContent(), {
      refreshToken: "r",
    });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.answer).toBe("hi"));
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer fresh-token",
    );
  });

  it("does not refresh on a coded 401 and surfaces the error", async () => {
    // Controllers raise coded 401s (space/auth-required, entity/user-required,
    // auth/user-required, …). No refresh can fix those.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Authentication required to filter by membership.",
          code: "space/auth-required",
        }),
        { status: 401 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Authentication required to filter by membership.",
    );
    expect(mockedRefresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a coded 401 returned by the RETRY instead of the generic message", async () => {
    // The retry carries a fresh token, so a 401 here is the server saying
    // something specific. Flattening it to "you must be signed in" loses that,
    // and left 401 asymmetric with 403 — a coded 403 on the retry falls through
    // to the generic !ok handler, which surfaces the server's own message.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "Authentication required to filter by membership.",
            code: "space/auth-required",
          }),
          { status: 401 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedRefresh.mockResolvedValue("fresh-token");

    const { result } = renderHookWithAxios(() => useAskContent(), {
      refreshToken: "r",
    });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe(
      "Authentication required to filter by membership.",
    );
  });

  it("still tells a genuinely signed-out caller to sign in", async () => {
    // Bare 401 with nothing to refresh with: the message must stay the
    // signed-out one, not the session-expired one the 403 path uses.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    mockedRefresh.mockResolvedValue(undefined);

    const { result } = renderHookWithAxios(() => useAskContent());

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("You must be signed in to use AI search.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a session-expired error when the refresh yields no token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    mockedRefresh.mockResolvedValue(undefined);

    const { result } = renderHookWithAxios(() => useAskContent(), {
      accessToken: "stale-token",
    });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Your session has expired. Please sign in again.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call fetch for a blank query or a missing project", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHookWithAxios(() => useAskContent(), { projectId: "" });

    act(() => {
      result.current.ask({ query: "hello" });
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
