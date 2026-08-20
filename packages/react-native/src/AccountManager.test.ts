import { describe, it, expect, vi, afterEach } from "vitest";

const getGenericPassword = vi.fn();
const setGenericPassword = vi.fn();
const resetGenericPassword = vi.fn();
const handleError = vi.fn();

vi.mock("react-native-keychain", () => ({
  getGenericPassword: (...args: unknown[]) => getGenericPassword(...args),
  setGenericPassword: (...args: unknown[]) => setGenericPassword(...args),
  resetGenericPassword: (...args: unknown[]) => resetGenericPassword(...args),
}));

vi.mock("@sublay/core", () => ({
  useAccountSync: vi.fn(),
  useProject: vi.fn(),
  handleError: (...args: unknown[]) => handleError(...args),
}));

import { keychainStorage } from "./AccountManager";

afterEach(() => {
  vi.clearAllMocks();
});

describe("keychainStorage.getAccountMap", () => {
  it("parses and returns the stored account map", async () => {
    const map = { activeAccountId: "user-1", accounts: {} };
    getGenericPassword.mockResolvedValue({ password: JSON.stringify(map) });

    await expect(keychainStorage.getAccountMap("project-1")).resolves.toEqual(map);
    expect(getGenericPassword).toHaveBeenCalledWith({
      service: "sublay-accounts:project-1",
    });
  });

  it("returns null when there are no stored credentials", async () => {
    getGenericPassword.mockResolvedValue(false);
    await expect(keychainStorage.getAccountMap("project-1")).resolves.toBeNull();
  });

  it("swallows errors and returns null when the Keychain read rejects", async () => {
    getGenericPassword.mockRejectedValue(new Error("keychain unavailable"));
    await expect(keychainStorage.getAccountMap("project-1")).resolves.toBeNull();
  });
});

describe("keychainStorage.setAccountMap", () => {
  it("writes the JSON-serialized map under a project-scoped service", async () => {
    setGenericPassword.mockResolvedValue(true);
    const map = { activeAccountId: "user-1", accounts: {} };

    await keychainStorage.setAccountMap("project-1", map);

    expect(setGenericPassword).toHaveBeenCalledWith(
      "sublay-accounts:project-1",
      JSON.stringify(map),
      { service: "sublay-accounts:project-1" },
    );
  });

  it("logs AND REJECTS when the write fails", async () => {
    // Inverted deliberately. This used to resolve void, which made
    // `await storage.setAccountMap(...)` succeed on a failed write — and any
    // guarantee built on that await (most dangerously "the rotated refresh
    // token is durably stored") fictional.
    setGenericPassword.mockRejectedValue(new Error("disk full"));

    await expect(
      keychainStorage.setAccountMap("project-1", { activeAccountId: null, accounts: {} })
    ).rejects.toThrow("disk full");

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe("Failed to write account map to Keychain");
  });
});

describe("keychainStorage.deleteAccountMap", () => {
  it("resets the generic password for the project-scoped service", async () => {
    resetGenericPassword.mockResolvedValue(true);

    await keychainStorage.deleteAccountMap("project-1");

    expect(resetGenericPassword).toHaveBeenCalledWith({
      service: "sublay-accounts:project-1",
    });
  });

  it("logs AND REJECTS when the reset fails", async () => {
    resetGenericPassword.mockRejectedValue(new Error("not found"));

    await expect(keychainStorage.deleteAccountMap("project-1")).rejects.toThrow(
      "not found"
    );

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe("Failed to delete account map from Keychain");
  });
});
