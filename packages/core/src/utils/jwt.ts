// Claim readers for the tokens the SDK holds.
//
// These decode WITHOUT verifying. The server is the only authority on whether a
// token is valid — everything here is for local decisions that would otherwise
// need a round trip (is this worth rotating, was this minted for the user we
// think is signed in).
//
// Every reader returns `null` for anything it cannot read, and leaves the
// meaning of "unknown" to the caller. That distinction is load-bearing: the
// auth gate treats an unreadable `exp` as "don't pre-emptively rotate", while
// account persistence treats it as "expired" — see the call sites.

/**
 * base64url -> UTF-8 string. Adds the padding base64url strips, and re-decodes
 * `atob`'s byte-wise output so non-ASCII claims survive `JSON.parse`.
 */
function base64UrlDecode(value: string): string | null {
  // Validate before decoding, so both branches below agree on what is
  // unreadable. `atob` throws on a stray character, but `Buffer.from(.., "base64")`
  // silently DISCARDS invalid characters — verified: "eyJhIjoxfQ!!!" and
  // "eyJhIjoxfQ" decode identically. Without this, a corrupted token would be
  // rejected on web and quietly accepted on React Native, which is exactly the
  // platform divergence this shared reader exists to remove.
  //
  // Trailing `=` is tolerated: JWS specifies base64url without padding, but
  // some encoders emit it anyway and `atob` accepts it.
  const unpadded = value.replace(/=+$/, "");
  if (!/^[A-Za-z0-9_-]*$/.test(unpadded) || unpadded.length % 4 === 1) {
    return null;
  }

  const base64 = unpadded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  if (typeof atob === "function") {
    const binary = atob(padded);
    return decodeURIComponent(
      Array.from(
        binary,
        (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
      ).join(""),
    );
  }

  // React Native without an `atob` polyfill: Buffer via Hermes/Node shim.
  const GlobalBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (typeof GlobalBuffer === "function") {
    return GlobalBuffer.from(padded, "base64").toString("utf-8");
  }

  return null;
}

/** The token's claims, or null if it isn't a readable JWT. */
export function decodeJwtPayload(
  token: string | null | undefined,
): Record<string, unknown> | null {
  if (!token) return null;

  try {
    const segment = token.split(".")[1];
    if (!segment) return null;

    const json = base64UrlDecode(segment);
    if (json === null) return null;

    const payload = JSON.parse(json);
    // Arrays and primitives both fail `typeof === "object"` usefully here — a
    // claims set is a plain object or it isn't a claims set.
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : null;
  } catch {
    return null;
  }
}

/**
 * Expiry as a millisecond epoch, or null when the token carries no readable
 * numeric `exp`. Callers decide what "unknown" means.
 */
export function readJwtExp(token: string | null | undefined): number | null {
  const exp = decodeJwtPayload(token)?.exp;

  // `typeof Infinity === "number"`, and `JSON.parse('{"exp":1e400}')` yields
  // exactly that. An infinite expiry would read as "never expiring" in the auth
  // gate, and `useAccountSync`'s `?? 0` would not catch it either — it only
  // maps null — so `tokenExpiresAt: Infinity` would reach storage, where
  // `JSON.stringify` rewrites it to null and breaks the `number` contract on
  // read-back. NaN is caught by the same check.
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;

  const expiresAt = exp * 1000;
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

/** The `sub` claim — the user id a token was minted for. */
export function readJwtSub(token: string | null | undefined): string | null {
  const sub = decodeJwtPayload(token)?.sub;
  return typeof sub === "string" ? sub : null;
}
