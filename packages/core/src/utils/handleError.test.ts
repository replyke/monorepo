import { describe, it, expect, vi, afterEach } from "vitest";

import { handleError, setSublayLogLevel, getSublayLogLevel } from "./handleError";

afterEach(() => {
  vi.restoreAllMocks();
  // Module-level setting — leaks across files if not reset.
  setSublayLogLevel("error");
});

describe("handleError", () => {
  it("logs and returns baseMessage + error + details for an axios error response", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = {
      response: { data: { error: "Bad request", details: "email is required" } },
    };

    const result = handleError(err, "Failed to sign up:");

    expect(result).toBe("Failed to sign up: - Bad request - email is required");
    expect(consoleSpy).toHaveBeenCalledWith("Failed to sign up: - Bad request - email is required");
  });

  it("omits the details segment when the response has only an error message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = { response: { data: { error: "Bad request" } } };

    expect(handleError(err, "Failed:")).toBe("Failed: - Bad request");
  });

  it("falls back to baseMessage alone when response.data has neither error nor details", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = { response: { data: {} } };

    // responseData is truthy (an empty object), so the err.message fallback
    // branch is intentionally skipped — this pins down that current behavior.
    expect(handleError(err, "Failed:")).toBe("Failed:");
  });

  it("falls back to err.message for a network error with no response", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = { message: "Network Error" };

    expect(handleError(err, "Request failed:")).toBe("Request failed: - Network Error");
  });

  it("falls back to err.message for a plain Error with no response", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("Something broke");

    expect(handleError(err, "Operation failed:")).toBe("Operation failed: - Something broke");
  });

  it("falls back to 'Unknown error' when the thrown value has no message and no response", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(handleError({}, "Operation failed:")).toBe("Operation failed: - Unknown error");
  });

  it("works without a baseMessage, leaving a leading separator", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(handleError({ message: "boom" })).toBe(" - boom");
  });
});

describe("setSublayLogLevel", () => {
  it("defaults to 'error' and logs through console.error", () => {
    expect(getSublayLogLevel()).toBe("error");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    handleError({ message: "boom" }, "Failed:");

    expect(errorSpy).toHaveBeenCalledWith("Failed: - boom");
  });

  it("routes to console.warn at level 'warn'", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    setSublayLogLevel("warn");
    handleError({ message: "boom" }, "Failed:");

    expect(warnSpy).toHaveBeenCalledWith("Failed: - boom");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs nothing at level 'silent' but still returns the message", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    setSublayLogLevel("silent");
    const result = handleError({ message: "boom" }, "Failed:");

    expect(result).toBe("Failed: - boom");
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
