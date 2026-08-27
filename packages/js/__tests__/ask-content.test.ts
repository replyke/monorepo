import axios from "axios";
import { askContent, AskContentEvent } from "../src/modules/search/askContent";
import { SublayHttpClient } from "../src/core/client";

/**
 * `askContent` talks to the server via raw `fetch` (an SSE stream), not the
 * axios `projectInstance` — so these tests mock `global.fetch` directly
 * rather than using the shared `makeClient()` helper (which only mocks
 * `projectInstance`). A real `SublayHttpClient` is used so `getAuthHeader()`
 * and `projectInstance.defaults.baseURL` behave exactly as in production.
 */

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function encodeSseBlock(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function makeReader(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    read: jest.fn(async () => {
      if (i < chunks.length) {
        const value = encoder.encode(chunks[i]);
        i++;
        return { done: false, value };
      }
      return { done: true, value: undefined };
    }),
    releaseLock: jest.fn(),
  };
}

function makeStreamResponse(reader: ReturnType<typeof makeReader>) {
  return {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
  } as unknown as Response;
}

async function drain(
  generator: AsyncGenerator<AskContentEvent, void, unknown>
): Promise<AskContentEvent[]> {
  const events: AskContentEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

describe("js-sdk askContent — request shaping", () => {
  it("POSTs to /search/ask with the body minus space-reputation fields, which go in query params", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "tok-a", refreshToken: "refresh-a" },
    });
    const reader = makeReader([encodeSseBlock("done", {})]);
    const fetchMock = jest.fn().mockResolvedValue(makeStreamResponse(reader));
    global.fetch = fetchMock as unknown as typeof fetch;

    await drain(
      askContent(client, {
        query: "how do refunds work?",
        spaceId: "s1",
        spaceReputationId: "rep1",
        spaceReputationDescendants: true,
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.sublay.io/v7/proj1/search/ask?spaceReputationId=rep1&spaceReputationDescendants=true"
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      query: "how do refunds work?",
      spaceId: "s1",
    });
    expect(init.headers.Authorization).toBe("Bearer tok-a");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("omits the query string entirely when no space-reputation fields are given", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([encodeSseBlock("done", {})]);
    const fetchMock = jest.fn().mockResolvedValue(makeStreamResponse(reader));
    global.fetch = fetchMock as unknown as typeof fetch;

    await drain(askContent(client, { query: "hi" }));

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.sublay.io/v7/proj1/search/ask"
    );
  });

  it("reads the token via getAuthHeader (host-managed mode) and omits Authorization when there is none", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      getToken: async () => null,
    });
    const reader = makeReader([encodeSseBlock("done", {})]);
    const fetchMock = jest.fn().mockResolvedValue(makeStreamResponse(reader));
    global.fetch = fetchMock as unknown as typeof fetch;

    await drain(askContent(client, { query: "hi" }));

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it("forwards an AbortSignal to fetch", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([encodeSseBlock("done", {})]);
    const fetchMock = jest.fn().mockResolvedValue(makeStreamResponse(reader));
    global.fetch = fetchMock as unknown as typeof fetch;
    const controller = new AbortController();

    await drain(askContent(client, { query: "hi", signal: controller.signal }));

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

describe("js-sdk askContent — SSE stream parsing", () => {
  it("yields token, sources, and done events parsed from SSE blocks", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([
      encodeSseBlock("token", { content: "It's " }),
      encodeSseBlock("token", { content: "about design." }),
      encodeSseBlock("sources", [{ entityId: "e1", title: "Intro" }]),
      encodeSseBlock("done", {}),
    ]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([
      { type: "token", content: "It's " },
      { type: "token", content: "about design." },
      { type: "sources", sources: [{ entityId: "e1", title: "Intro" }] },
      { type: "done" },
    ]);
  });

  it("reassembles an SSE block whose blank-line terminator is split across two reader.read() calls", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const full = encodeSseBlock("token", { content: "hello" });
    const splitPoint = full.indexOf("\n\n") + 1; // split inside the "\n\n" terminator
    const reader = makeReader([full.slice(0, splitPoint), full.slice(splitPoint)]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "token", content: "hello" }]);
  });

  it("yields multiple events found within a single reader.read() chunk before reading again", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([
      encodeSseBlock("token", { content: "a" }) + encodeSseBlock("token", { content: "b" }),
    ]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([
      { type: "token", content: "a" },
      { type: "token", content: "b" },
    ]);
    // Both events came out of the single chunk; the only extra read() call is the
    // final one that returns { done: true }.
    expect(reader.read).toHaveBeenCalledTimes(2);
  });

  it("flushes a trailing event that wasn't terminated by a final blank line", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    // No trailing "\n\n" on the last block.
    const reader = makeReader(["event: token\ndata: " + JSON.stringify({ content: "tail" })]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "token", content: "tail" }]);
  });

  it("silently drops a block with an unrecognized/default event type", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([
      "data: ignored\n\n", // no "event:" line -> defaults to "message", not in the switch
      encodeSseBlock("done", {}),
    ]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "done" }]);
  });

  it("releases the reader lock once the stream is fully drained", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([encodeSseBlock("done", {})]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    await drain(askContent(client, { query: "hi" }));

    expect(reader.releaseLock).toHaveBeenCalledTimes(1);
  });
});

describe("js-sdk askContent — error responses", () => {
  it("yields an error event with the server's JSON error message when the response isn't ok", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const response = {
      ok: false,
      status: 500,
      body: {},
      json: jest.fn().mockResolvedValue({ error: "Something broke" }),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "error", error: "Something broke" }]);
  });

  it("falls back to a status-based message when the error body isn't JSON", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const response = {
      ok: false,
      status: 503,
      body: {},
      json: jest.fn().mockRejectedValue(new Error("not json")),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "error", error: "Request failed with status 503" }]);
  });

  it("yields an error event when the response is ok but has no body", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const response = { ok: true, status: 200, body: null } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "error", error: "Request failed with status 200" }]);
  });

  it("does NOT trigger the SDK's auth-refresh logic on a 403, unlike every axios-based call", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "stale-token", refreshToken: "refresh-a" },
    });
    const response = {
      ok: false,
      status: 403,
      body: {},
      json: jest.fn().mockResolvedValue({ error: "Forbidden" }),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;
    const refreshSpy = jest.spyOn(axios, "post");

    const events = await drain(askContent(client, { query: "hi" }));

    expect(events).toEqual([{ type: "error", error: "Forbidden" }]);
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1); // no retry attempt either
  });
});

describe("js-sdk askContent — cancellation", () => {
  it("stops reading and releases the reader lock when the consumer breaks out of the for-await loop", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const reader = makeReader([
      encodeSseBlock("token", { content: "a" }),
      encodeSseBlock("token", { content: "b" }),
      encodeSseBlock("done", {}),
    ]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader)) as unknown as typeof fetch;

    const generator = askContent(client, { query: "hi" });
    const seen: AskContentEvent[] = [];
    for await (const event of generator) {
      seen.push(event);
      break;
    }

    expect(seen).toEqual([{ type: "token", content: "a" }]);
    // Only the first chunk was ever read; breaking must not drain the rest.
    expect(reader.read).toHaveBeenCalledTimes(1);
    expect(reader.releaseLock).toHaveBeenCalledTimes(1);
  });

  it("propagates the AbortError and still releases the reader lock when the signal aborts mid-stream", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const abortError = Object.assign(new Error("This operation was aborted"), {
      name: "AbortError",
    });
    const releaseLock = jest.fn();
    const reader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(encodeSseBlock("token", { content: "a" })),
        })
        .mockRejectedValueOnce(abortError),
      releaseLock,
    };
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeStreamResponse(reader as never)) as unknown as typeof fetch;

    const generator = askContent(client, { query: "hi" });
    const seen: AskContentEvent[] = [];
    await expect(
      (async () => {
        for await (const event of generator) seen.push(event);
      })()
    ).rejects.toBe(abortError);

    expect(seen).toEqual([{ type: "token", content: "a" }]);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("rejects without yielding an error event when fetch itself rejects because the signal was already aborted", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    const abortError = Object.assign(new Error("This operation was aborted"), {
      name: "AbortError",
    });
    global.fetch = jest.fn().mockRejectedValue(abortError) as unknown as typeof fetch;
    const controller = new AbortController();
    controller.abort();

    const generator = askContent(client, { query: "hi", signal: controller.signal });

    await expect(drain(generator)).rejects.toBe(abortError);
  });
});
