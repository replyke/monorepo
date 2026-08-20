import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const useAccountSync = vi.fn();
const useProject = vi.fn();
const handleError = vi.fn();

vi.mock("@sublay/core", () => ({
  useAccountSync: (...args: unknown[]) => useAccountSync(...args),
  useProject: () => useProject(),
  handleError: (...args: unknown[]) => handleError(...args),
}));

import AccountManager, { webAccountStorage } from "./AccountManager";

describe("AccountManager (react-js)", () => {
  beforeEach(() => {
    localStorage.clear();
    useProject.mockReturnValue({ projectId: "test-project" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wires useAccountSync with the web storage adapter and the current projectId", () => {
    render(<AccountManager />);

    expect(useAccountSync).toHaveBeenCalledTimes(1);
    const [storageArg, projectIdArg] = useAccountSync.mock.calls[0];
    expect(storageArg).toBe(webAccountStorage);
    expect(projectIdArg).toBe("test-project");
  });

  it("renders nothing", () => {
    const { container } = render(<AccountManager />);
    expect(container.firstChild).toBeNull();
  });
});

describe("webAccountStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns null when nothing has been stored for the project", async () => {
    await expect(webAccountStorage.getAccountMap("project-1")).resolves.toBeNull();
  });

  it("round-trips a stored account map under a project-scoped key", async () => {
    const map = {
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: "rt",
          tokenExpiresAt: 0,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    };

    await webAccountStorage.setAccountMap("project-1", map);
    expect(localStorage.getItem("sublay-accounts:project-1")).toBe(JSON.stringify(map));
    await expect(webAccountStorage.getAccountMap("project-1")).resolves.toEqual(map);
  });

  it("deletes the stored map for a project", async () => {
    await webAccountStorage.setAccountMap("project-1", { activeAccountId: null, accounts: {} });
    await webAccountStorage.deleteAccountMap("project-1");
    expect(localStorage.getItem("sublay-accounts:project-1")).toBeNull();
  });

  it("returns null instead of throwing when stored JSON is corrupt", async () => {
    localStorage.setItem("sublay-accounts:project-1", "{not json");
    await expect(webAccountStorage.getAccountMap("project-1")).resolves.toBeNull();
  });

  it("logs AND REJECTS when localStorage.setItem throws", async () => {
    // Inverted deliberately — see the interface docblock: a write contract that
    // resolves on failure makes every awaited persist a lie.
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await expect(
      webAccountStorage.setAccountMap("project-1", { activeAccountId: null, accounts: {} })
    ).rejects.toThrow("quota exceeded");

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe("Failed to write account map to localStorage");

    setItemSpy.mockRestore();
  });

  it("logs AND REJECTS when localStorage.removeItem throws", async () => {
    const removeItemSpy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });

    await expect(
      webAccountStorage.deleteAccountMap("project-1")
    ).rejects.toThrow("storage disabled");

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe(
      "Failed to delete account map from localStorage"
    );

    removeItemSpy.mockRestore();
  });
});
