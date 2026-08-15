import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { decodeJwtPayload, readJwtExp, readJwtSub } from "./jwt";

function encodeSegment(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(claims: Record<string, unknown>): string {
  return `${encodeSegment({ alg: "HS256" })}.${encodeSegment(claims)}.sig`;
}

describe("decodeJwtPayload", () => {
  it("reads the claims of a well-formed token", () => {
    expect(decodeJwtPayload(makeJwt({ sub: "user-1", role: "user" }))).toEqual({
      sub: "user-1",
      role: "user",
    });
  });

  it("survives base64url without padding", () => {
    // base64url strips `=`, so a payload whose length isn't a multiple of 4
    // only decodes if the padding is restored.
    const token = makeJwt({ a: 1 });
    expect(token.split(".")[1]).not.toContain("=");
    expect(decodeJwtPayload(token)).toEqual({ a: 1 });
  });

  it("survives non-ASCII claims", () => {
    // A byte-wise atob would hand mojibake to JSON.parse here.
    const claims = { sub: "user-1", name: "Zoë Ünicode 日本語 🎉" };
    expect(decodeJwtPayload(makeJwt(claims))).toEqual(claims);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["not a jwt", "not-a-jwt"],
    ["single segment", "onlyone"],
    ["garbage payload", "header.!!!not-base64!!!.sig"],
    ["non-object payload", `${encodeSegment({ a: 1 })}.${encodeSegment([] as never)}.sig`],
  ])("returns null for %s rather than throwing", (_label, token) => {
    expect(decodeJwtPayload(token as string)).toBeNull();
  });

  describe("on the React Native (Buffer) branch, with no atob", () => {
    // This guard is INVISIBLE under jsdom: `atob` exists and throws on invalid
    // input all by itself. It only earns its keep where `Buffer` does the
    // decoding, because `Buffer.from(.., "base64")` silently DISCARDS invalid
    // characters — verified: "eyJhIjoxfQ!!!" and "eyJhIjoxfQ" decode
    // identically. Without forcing that branch these assertions pass either
    // way, so the platform the fix is FOR would go untested.
    beforeEach(() => {
      vi.stubGlobal("atob", undefined);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("still decodes a clean segment", () => {
      expect(decodeJwtPayload(makeJwt({ sub: "user-1" }))).toEqual({
        sub: "user-1",
      });
    });

    it("rejects characters outside the base64url alphabet, as atob would", () => {
      const valid = encodeSegment({ sub: "user-1" });
      expect(decodeJwtPayload(`header.${valid}!!!.sig`)).toBeNull();
    });

    it("rejects a segment of impossible base64 length", () => {
      // No valid base64 encoding has length % 4 === 1.
      expect(decodeJwtPayload("header.abcde.sig")).toBeNull();
    });
  });

  it("rejects a segment of impossible base64 length on the atob branch too", () => {
    expect(decodeJwtPayload("header.abcde.sig")).toBeNull();
  });

  it("still accepts a segment that carries explicit padding", () => {
    // JWS specifies base64url without padding, but some encoders emit it and
    // `atob` accepts it — rejecting it would break real tokens.
    const claims = { sub: "user-1" };
    const padded = Buffer.from(JSON.stringify(claims))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(padded.endsWith("=")).toBe(true);
    expect(decodeJwtPayload(`header.${padded}.sig`)).toEqual(claims);
  });
});

describe("readJwtExp", () => {
  it("returns the expiry in milliseconds", () => {
    expect(readJwtExp(makeJwt({ exp: 9999999999 }))).toBe(9999999999000);
  });

  it.each([
    ["a missing exp", makeJwt({ sub: "user-1" })],
    ["a null exp", makeJwt({ exp: null })],
    ["a string exp", makeJwt({ exp: "9999999999" })],
    ["an unreadable token", "not-a-jwt"],
  ])("returns null for %s, leaving the policy to the caller", (_label, token) => {
    // Deliberately null, not 0: the auth gate must read this as "unknown, don't
    // rotate", while useAccountSync maps it to 0 to mean "treat as expired".
    expect(readJwtExp(token)).toBeNull();
  });

  it("rejects a non-finite exp", () => {
    // `typeof Infinity === "number"`, and JSON.parse produces exactly that for
    // 1e400. Left through, it reads as "never expires" in the auth gate, and
    // `useAccountSync`'s `?? 0` does not catch it (that only maps null) — so
    // `tokenExpiresAt: Infinity` reaches storage, where JSON.stringify rewrites
    // it to null and breaks the `number` contract on read-back.
    const infinite = `${encodeSegment({ alg: "HS256" })}.${Buffer.from(
      String.raw`{"exp":1e400}`,
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")}.sig`;

    expect(decodeJwtPayload(infinite)?.exp).toBe(Infinity);
    expect(readJwtExp(infinite)).toBeNull();
  });

  it("rejects an exp that overflows to Infinity once scaled to milliseconds", () => {
    expect(readJwtExp(makeJwt({ exp: Number.MAX_VALUE }))).toBeNull();
  });

  it("rejects a NaN exp", () => {
    // JSON has no NaN literal, so this arrives via a payload that parses to it.
    expect(readJwtExp(makeJwt({ exp: "NaN" }))).toBeNull();
  });
});

describe("readJwtSub", () => {
  it("returns the sub claim", () => {
    expect(readJwtSub(makeJwt({ sub: "user-1" }))).toBe("user-1");
  });

  it.each([
    ["a missing sub", makeJwt({ exp: 1 })],
    ["a non-string sub", makeJwt({ sub: 42 })],
    ["an unreadable token", "not-a-jwt"],
    ["null", null],
  ])("returns null for %s", (_label, token) => {
    expect(readJwtSub(token as string)).toBeNull();
  });
});
