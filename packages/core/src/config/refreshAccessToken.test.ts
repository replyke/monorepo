import { describe, it, expect, vi } from "vitest";
import { refreshAccessToken } from "./refreshAccessToken";

describe("refreshAccessToken", () => {
  it("coalesces concurrent callers onto a single rotation", async () => {
    let resolve!: (t: string) => void;
    const fn = vi.fn(
      () => new Promise<string>((r) => { resolve = r; }),
    );

    const p1 = refreshAccessToken(fn);
    const p2 = refreshAccessToken(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    resolve("fresh");
    await expect(p1).resolves.toBe("fresh");
    await expect(p2).resolves.toBe("fresh");
  });

  it("clears the lock so a later call triggers a new rotation", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("a")
      .mockResolvedValueOnce("b");

    await expect(refreshAccessToken(fn)).resolves.toBe("a");
    await expect(refreshAccessToken(fn)).resolves.toBe("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clears the lock after a rejected rotation", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");

    await expect(refreshAccessToken(fn)).rejects.toThrow("boom");
    await expect(refreshAccessToken(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("resolves undefined when no refresher is provided", async () => {
    await expect(refreshAccessToken(undefined)).resolves.toBeUndefined();
  });
});
