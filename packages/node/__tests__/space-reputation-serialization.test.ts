import axios from "axios";

import { searchContent } from "../src/modules/search";
import { fetchManyEntities, fetchEntity } from "../src/modules/entities";
import { fetchUserByForeignId } from "../src/modules/users";
import { buildSpaceReputationParams } from "../src/core/spaceReputationParams";
import { makeClient, MockAxiosInstance } from "./helpers/mockClient";

/**
 * THE serialization regression guard for the `spaceReputation` object (Task 3.4).
 *
 * The central risk: if the nested `spaceReputation` object is forwarded to axios
 * `params` un-normalized, axios bracket-encodes it
 * (`spaceReputation%5BspaceId%5D=…`) and the server IGNORES it — so the new
 * (primary) form silently no-ops while the deprecated flat props keep working.
 * Typecheck and the existing flat-prop tests both stay green when that happens.
 *
 * These tests pass the OBJECT form, capture the exact `params` object handed to
 * the mocked axios instance, serialize it through axios's OWN default param
 * serializer (`getUri`), and assert the resulting query string is the FLAT
 * `spaceReputationId=…&spaceReputationDescendants=…` — never dropped, never
 * bracketed. Each forwarding shape present in the modules is covered:
 *   - silent-drop (explicit `params: { spaceReputationId, ... }`)   → searchContent
 *   - silent-drop (explicit field-assign params object)            → fetchUserByForeignId
 *   - `params: data` bracket-leak                                  → fetchManyEntities
 *   - rest-spread `const { id, ...params } = data` bracket-leak    → fetchEntity
 */

// A real axios instance used purely as an oracle for default param
// serialization — the same algorithm the SDK's live instances use.
const serializer = axios.create();

/** Serialize a captured `params` object exactly as axios would put it on the wire. */
function serializeParams(params: unknown): string {
  const uri = serializer.getUri({ url: "/x", params: params as any });
  const qIndex = uri.indexOf("?");
  return qIndex === -1 ? "" : uri.slice(qIndex + 1);
}

/** Pull the `params` object out of the most recent axios get/post mock call. */
function capturedParams(method: jest.Mock): unknown {
  const call = method.mock.calls[method.mock.calls.length - 1];
  // get(path, config) → config is arg 1; post(path, body, config) → config is arg 2.
  const config = call.length >= 3 ? call[2] : call[1];
  return (config as { params?: unknown })?.params;
}

function assertFlatRepQuery(method: jest.Mock) {
  const params = capturedParams(method) as Record<string, unknown>;

  // The object must never reach axios params un-normalized.
  expect(params).not.toHaveProperty("spaceReputation");
  // It must be flattened (not dropped).
  expect(params.spaceReputationId).toBe("rep1");
  expect(params.spaceReputationDescendants).toBe(true);

  // And the serialized wire string must be flat, never bracketed.
  const query = serializeParams(params);
  expect(query).toContain("spaceReputationId=rep1");
  expect(query).toContain("spaceReputationDescendants=true");
  expect(query).not.toContain("spaceReputation%5B"); // spaceReputation[
  expect(query).not.toContain("spaceReputation["); // un-encoded, just in case
}

describe("space-reputation serialization guard — object form never drops or brackets", () => {
  it("silent-drop shape (explicit params object): searchContent", async () => {
    const { client, projectInstance } = makeClient();
    await searchContent(client, {
      query: "hello",
      spaceReputation: { spaceId: "rep1", includeDescendants: true },
    });
    assertFlatRepQuery(projectInstance.post as unknown as jest.Mock);
  });

  it("silent-drop shape (explicit field-assign): fetchUserByForeignId", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserByForeignId(client, {
      foreignId: "fid-1",
      spaceReputation: { spaceId: "rep1", includeDescendants: true },
    });
    assertFlatRepQuery(projectInstance.get as unknown as jest.Mock);
  });

  it("`params: data` bracket-leak shape: fetchManyEntities", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyEntities(client, {
      sortBy: "hot",
      spaceReputation: { spaceId: "rep1", includeDescendants: true },
    });
    assertFlatRepQuery(projectInstance.get as unknown as jest.Mock);
    // The unrelated param still rides along.
    const params = capturedParams(projectInstance.get as unknown as jest.Mock) as Record<
      string,
      unknown
    >;
    expect(params.sortBy).toBe("hot");
  });

  it("rest-spread bracket-leak shape: fetchEntity", async () => {
    const { client, projectInstance } = makeClient();
    await fetchEntity(client, {
      entityId: "e1",
      include: "author",
      spaceReputation: { spaceId: "rep1", includeDescendants: true },
    });
    assertFlatRepQuery(projectInstance.get as unknown as jest.Mock);
    const params = capturedParams(projectInstance.get as unknown as jest.Mock) as Record<
      string,
      unknown
    >;
    expect(params.include).toBe("author");
    expect(params).not.toHaveProperty("entityId"); // path param, not a query param
  });

  it("object form wins over deprecated flat props (precedence)", () => {
    const out = buildSpaceReputationParams({
      spaceReputation: { spaceId: "rep1", includeDescendants: true },
      spaceReputationId: "ignored",
      spaceReputationDescendants: false,
    });
    expect(out).toEqual({
      spaceReputationId: "rep1",
      spaceReputationDescendants: true,
    });
  });

  it("`spaceId: \"none\"` flattens to `spaceReputationId=none` without descendants", () => {
    const out = buildSpaceReputationParams({
      spaceReputation: { spaceId: "none" },
    });
    expect(out).toEqual({ spaceReputationId: "none" });
  });
});
