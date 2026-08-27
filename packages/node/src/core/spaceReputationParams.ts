/**
 * Input accepted by {@link buildSpaceReputationParams}: either the new
 * `spaceReputation` object or the deprecated flat props.
 *
 * The flat inputs accept `null` (in addition to `undefined`) so the helper's
 * contract matches `@sublay/core` exactly; `null` is treated as unset. node-sdk
 * never persists these params, so the `null` tolerance is not strictly required
 * here, but matching core is harmless and consistent.
 */
export interface BuildSpaceReputationParamsInput {
  spaceReputation?: {
    spaceId: string | "none" | "context";
    includeDescendants?: boolean;
  };
  /**
   * @deprecated Pass `spaceReputation` instead. Accepted for back-compat.
   */
  spaceReputationId?: string | null;
  /**
   * @deprecated Pass `spaceReputation` instead. Accepted for back-compat.
   */
  spaceReputationDescendants?: boolean | null;
}

/**
 * Flat output handed to the query-string serializer (axios `params`). Both keys
 * are omitted when unset — never bracketed, never nested.
 */
export interface SpaceReputationFlatParams {
  spaceReputationId?: string;
  spaceReputationDescendants?: boolean;
}

// Ambient `process` declaration so this file typechecks under the publish build
// tsconfig (which does not pull in @types/node). At runtime node-sdk always runs
// under Node, so `process.env` is present; the `typeof` guard keeps it safe
// anywhere it isn't.
declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;

let bothFormsWarned = false;

function isProduction(): boolean {
  return (
    typeof process !== "undefined" &&
    !!process.env &&
    process.env.NODE_ENV === "production"
  );
}

/**
 * Normalize the `spaceReputation` object or the deprecated flat props down to
 * the flat query params the server understands
 * (`spaceReputationId` / `spaceReputationDescendants`).
 *
 * **Critical:** this is the only thing that prevents the nested
 * `spaceReputation` object from reaching axios `params`, where axios would
 * bracket-encode it (`spaceReputation[spaceId]=…`) and the server would ignore
 * it — silently no-opping the new (primary) form. Every reputation-consuming
 * module must route the object through here and merge only the flat output.
 *
 * Rules (mirrors the `@sublay/core` helper contract):
 * - **Object wins when present.** "Present" means the `spaceReputation` key was
 *   supplied at all (`spaceReputation !== undefined`) — even `{}` or a partial
 *   object suppresses the flat props.
 * - When **both** the object and a flat prop are supplied, the object wins and a
 *   one-time dev-only `console.warn` fires (never throws).
 * - The flat inputs tolerate `null` (treated as unset → param omitted).
 * - Output keys are omitted when unset; the result is always the two flat keys,
 *   never a bracketed/nested object.
 */
export function buildSpaceReputationParams(
  input: BuildSpaceReputationParamsInput
): SpaceReputationFlatParams {
  const { spaceReputation, spaceReputationId, spaceReputationDescendants } =
    input;

  const objectPresent = spaceReputation !== undefined;
  const flatPresent =
    (spaceReputationId !== undefined && spaceReputationId !== null) ||
    (spaceReputationDescendants !== undefined &&
      spaceReputationDescendants !== null);

  if (objectPresent && flatPresent && !bothFormsWarned && !isProduction()) {
    bothFormsWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[Sublay] Both `spaceReputation` and the deprecated flat props " +
        "(`spaceReputationId` / `spaceReputationDescendants`) were supplied. " +
        "The `spaceReputation` object takes precedence; the flat props are ignored. " +
        "Remove the flat props — they are deprecated."
    );
  }

  const result: SpaceReputationFlatParams = {};

  if (objectPresent) {
    // Object form chosen. Read from the object; ignore the flat props entirely.
    const spaceId = spaceReputation!.spaceId;
    if (spaceId !== undefined && spaceId !== null) {
      result.spaceReputationId = spaceId;
    }
    const includeDescendants = spaceReputation!.includeDescendants;
    if (includeDescendants !== undefined && includeDescendants !== null) {
      result.spaceReputationDescendants = includeDescendants;
    }
    return result;
  }

  // Flat form. `null` is treated as unset (param omitted).
  if (spaceReputationId !== undefined && spaceReputationId !== null) {
    result.spaceReputationId = spaceReputationId;
  }
  if (
    spaceReputationDescendants !== undefined &&
    spaceReputationDescendants !== null
  ) {
    result.spaceReputationDescendants = spaceReputationDescendants;
  }

  return result;
}
