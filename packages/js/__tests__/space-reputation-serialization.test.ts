import axios from "axios";

import { fetchManyEntities } from "../src/modules/entities/fetchManyEntities";
import { fetchUserByForeignId } from "../src/modules/users/fetchUserByForeignId";
import { fetchEntity } from "../src/modules/entities/fetchEntity";
import { fetchUserById } from "../src/modules/users/fetchUserById";
import { searchContent } from "../src/modules/search/searchContent";
import { sendMessage } from "../src/modules/chat/sendMessage";
import { askContent, AskContentEvent } from "../src/modules/search/askContent";
import { SublayHttpClient } from "../src/core/client";
import { makeClient } from "./helpers/client";

/**
 * THE CENTRAL-RISK REGRESSION GUARD.
 *
 * The new `spaceReputation` object must NEVER reach a query-string serializer
 * un-normalized. If a nested `{ spaceId, includeDescendants }` object survives
 * into axios `params`, axios bracket-encodes it (`spaceReputation[spaceId]=…`);
 * if it survives into `askContent`'s `URLSearchParams`, it stringifies to
 * `[object Object]`. Both are silently ignored by the server while the flat
 * props keep working — so the bug passes typecheck AND passes the old
 * flat-prop tests. These tests are the only thing that catches it.
 *
 * Strategy: for the axios modules we assert the EXACT `params` object handed to
 * axios (so a surviving `spaceReputation` key fails the test), AND we run that
 * params object through axios's real default param serializer to prove the
 * wire query string is the flat `spaceReputationId=…&spaceReputationDescendants=…`
 * — never bracketed, never dropped. For `askContent` (URLSearchParams) we
 * assert the actual URL.
 *
 * Coverage spans every js-sdk forwarding shape:
 *  - `params: data` bracket-leak: fetchManyEntities (context), fetchUserByForeignId (users)
 *  - rest-spread bracket-leak:    fetchEntity (context), fetchUserById (users)
 *  - silent-drop:                 searchContent (context), sendMessage (context)
 *  - URLSearchParams generator:   askContent (context)
 */

/**
 * Serialize an axios `params` object exactly as axios would on the wire, using
 * axios's own `getUri` (which runs the instance's default params serializer).
 * A nested object would come back bracket-encoded here, so this is a faithful
 * stand-in for the real query string.
 */
function serializeWithAxios(params: Record<string, unknown>): string {
  const instance = axios.create();
  const uri = instance.getUri({ url: "/x", params });
  const idx = uri.indexOf("?");
  return idx === -1 ? "" : uri.slice(idx + 1);
}

function getParams(mockFn: jest.Mock, call = 0): Record<string, unknown> {
  const args = mockFn.mock.calls[call];
  const config = args[args.length - 1];
  return config.params as Record<string, unknown>;
}

async function drain(
  generator: AsyncGenerator<AskContentEvent, void, unknown>
): Promise<void> {
  for await (const _ of generator) {
    // exhaust
  }
}

function encodeSseBlock(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const reader = {
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
  return {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
  } as unknown as Response;
}

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const OBJECT_FORM = {
  spaceReputation: { spaceId: "space-1", includeDescendants: true },
} as const;

/**
 * Asserts the params object axios received carries the FLAT pair and no nested
 * `spaceReputation` key, and that axios's own serializer turns it into a flat
 * query string.
 */
function expectFlatParams(params: Record<string, unknown>) {
  expect(params).not.toHaveProperty("spaceReputation");
  expect(params.spaceReputationId).toBe("space-1");
  expect(params.spaceReputationDescendants).toBe(true);

  const query = serializeWithAxios(params);
  expect(query).toContain("spaceReputationId=space-1");
  expect(query).toMatch(/spaceReputationDescendants=true/);
  // Never bracketed.
  expect(query).not.toContain("spaceReputation%5B");
  expect(query).not.toContain("spaceReputation[");
  expect(query).not.toContain("object%20Object");
}

describe("space-reputation serialization guard — params: data bracket-leak shape", () => {
  it("fetchManyEntities (context) flattens the object form into params, never bracketed", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyEntities(client, { sortBy: "hot", ...OBJECT_FORM });
    expectFlatParams(getParams(projectInstance.get));
  });

  it("fetchUserByForeignId (users) flattens the object form into params, never bracketed", async () => {
    // NOTE: in js-sdk this is a `params: data` bracket-leak shape; in node-sdk
    // the same module is a silent-drop (explicit field-assign). Re-classified
    // from js-sdk's own code.
    const { client, projectInstance } = makeClient();
    await fetchUserByForeignId(client, { foreignId: "f1", ...OBJECT_FORM });
    expectFlatParams(getParams(projectInstance.get));
  });
});

describe("space-reputation serialization guard — rest-spread bracket-leak shape", () => {
  it("fetchEntity (context) flattens the object form into params, never bracketed", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntity(client, { entityId: "e1", ...OBJECT_FORM });
    expectFlatParams(getParams(projectInstance.get));
  });

  it("fetchUserById (users) flattens the object form into params, never bracketed", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserById(client, { userId: "u1", ...OBJECT_FORM });
    expectFlatParams(getParams(projectInstance.get));
  });
});

describe("space-reputation serialization guard — silent-drop shape", () => {
  it("searchContent (context) routes the object form into params, not dropped", async () => {
    const { client, projectInstance } = makeClient();
    await searchContent(client, { query: "hi", ...OBJECT_FORM });
    expectFlatParams(getParams(projectInstance.post));
    // And it must not have leaked into the POST body either.
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("spaceReputation");
    expect(body).not.toHaveProperty("spaceReputationId");
  });

  it("sendMessage (context) routes the object form into params, not dropped", async () => {
    const { client, projectInstance } = makeClient();
    await sendMessage(client, { conversationId: "c1", content: "hi", ...OBJECT_FORM });
    expectFlatParams(getParams(projectInstance.post));
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("spaceReputation");
  });
});

describe("space-reputation serialization guard — askContent URLSearchParams path", () => {
  it("builds a flat query string from the object form, never [object Object]", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "tok-a", refreshToken: "refresh-a" },
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValue(makeStreamResponse([encodeSseBlock("done", {})]));
    global.fetch = fetchMock as unknown as typeof fetch;

    await drain(askContent(client, { query: "hi", ...OBJECT_FORM }));

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.sublay.io/v7/proj1/search/ask?spaceReputationId=space-1&spaceReputationDescendants=true"
    );
    expect(url).not.toContain("spaceReputation%5B");
    expect(url).not.toContain("object");
  });
});

describe("space-reputation serialization guard — precedence", () => {
  it("the object form wins over the deprecated flat props", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntity(client, {
      entityId: "e1",
      spaceReputation: { spaceId: "space-1", includeDescendants: true },
      // These deprecated flat props must be ignored in favor of the object.
      spaceReputationId: "STALE",
      spaceReputationDescendants: false,
    });
    const params = getParams(projectInstance.get);
    expect(params.spaceReputationId).toBe("space-1");
    expect(params.spaceReputationDescendants).toBe(true);
  });
});
