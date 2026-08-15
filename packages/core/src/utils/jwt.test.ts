import { describe, it, expect } from "vitest";

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
