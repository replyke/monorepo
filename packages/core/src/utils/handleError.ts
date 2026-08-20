/**
 * How loudly the SDK reports handled failures to the console.
 *
 * - `error` (default) — `console.error`, exactly as before.
 * - `warn`   — `console.warn`, for apps whose crash reporters treat
 *              `console.error` as a signal.
 * - `silent` — no console output at all. `handleError` still returns the
 *              composed message, so callers that surface it in the UI are
 *              unaffected.
 */
export type SublayLogLevel = "error" | "warn" | "silent";

let logLevel: SublayLogLevel = "error";

/**
 * Sets the SDK's error log level.
 *
 * **A bare setter, deliberately — not a `SublayProvider` prop.** The setting is
 * process-global (`handleError` is a plain function imported by ~60 modules; a
 * per-call-site option would mean touching all of them), and this codebase
 * explicitly supports two providers being mounted at once. A prop would read as
 * per-provider while silently being last-mount-wins, and would not restore on
 * unmount.
 *
 * Coarse by design: it silences *all* SDK logging, unexpected failures
 * included. There is no per-condition severity, because the call site usually
 * cannot know whether its own failure was expected.
 *
 * ```ts
 * import { setSublayLogLevel } from "@sublay/core";
 * setSublayLogLevel("silent");
 * ```
 */
export const setSublayLogLevel = (level: SublayLogLevel): void => {
  logLevel = level;
};

/** The current SDK log level. */
export const getSublayLogLevel = (): SublayLogLevel => logLevel;

export const handleError = (err: any, baseMessage?: string) => {
  let messages = [baseMessage ?? ""];

  const responseData = err.response?.data;
  if (responseData) {
    if (responseData.error) {
      messages.push(responseData.error);
    }
    if (responseData.details) {
      messages.push(responseData.details);
    }
  } else {
    // Fallback to the default error message if no response data is available
    messages.push(err.message || "Unknown error");
  }

  const message = messages.join(" - ");

  if (logLevel === "error") {
    console.error(message);
  } else if (logLevel === "warn") {
    console.warn(message);
  }

  return message;
};
