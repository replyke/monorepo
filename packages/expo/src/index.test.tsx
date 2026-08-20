import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

const useAccountSync = vi.fn();
const useProject = vi.fn();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("expo-notifications", () => ({}));
vi.mock("expo-web-browser", () => ({ openAuthSessionAsync: vi.fn() }));
vi.mock("expo-linking", () => ({ createURL: vi.fn(() => "sublay://auth") }));

vi.mock("@sublay/core", () => ({
  SublayProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SublayIntegrationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAccountSync: (...args: unknown[]) => useAccountSync(...args),
  useProject: () => useProject(),
  handleError: vi.fn(),
}));

import { SublayIntegrationProvider } from "./index";
import { secureStoreStorage } from "./AccountManager";

beforeEach(() => {
  useProject.mockReturnValue({ projectId: "test-project" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("expo provider overrides", () => {
  it("SublayIntegrationProvider mounts AccountManager with the SecureStore adapter", () => {
    render(
      <SublayIntegrationProvider projectId="test-project">
        <div>app</div>
      </SublayIntegrationProvider>
    );

    expect(useAccountSync).toHaveBeenCalledTimes(1);
    expect(useAccountSync.mock.calls[0][0]).toBe(secureStoreStorage);
    expect(useAccountSync.mock.calls[0][1]).toBe("test-project");
  });
});
