import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

const useAccountSync = vi.fn();
const useProject = vi.fn();

vi.mock("@sublay/core", () => ({
  // Passthrough stand-ins: this file is testing the WRAPPING, not core.
  SublayProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SublayIntegrationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAccountSync: (...args: unknown[]) => useAccountSync(...args),
  useProject: () => useProject(),
  handleError: vi.fn(),
}));

import { SublayProvider, SublayIntegrationProvider } from "./index";
import { webAccountStorage } from "./AccountManager";

beforeEach(() => {
  useProject.mockReturnValue({ projectId: "test-project" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("react-js provider overrides", () => {
  it("SublayIntegrationProvider mounts AccountManager with the web storage adapter", () => {
    // A pre-existing defect this closes: core re-exports its own integration
    // provider untouched, and core cannot mount an AccountManager itself
    // (it is per-platform by construction) — so integration-mode apps
    // persisted NOTHING and multi-account never survived a relaunch.
    render(
      <SublayIntegrationProvider projectId="test-project">
        <div>app</div>
      </SublayIntegrationProvider>
    );

    expect(useAccountSync).toHaveBeenCalledTimes(1);
    expect(useAccountSync.mock.calls[0][0]).toBe(webAccountStorage);
    expect(useAccountSync.mock.calls[0][1]).toBe("test-project");
  });

  it("renders its children", () => {
    const { getByText } = render(
      <SublayIntegrationProvider projectId="test-project">
        <div>app</div>
      </SublayIntegrationProvider>
    );
    expect(getByText("app")).toBeTruthy();
  });

  it("SublayProvider still mounts AccountManager the same way", () => {
    render(
      <SublayProvider projectId="test-project">
        <div>app</div>
      </SublayProvider>
    );
    expect(useAccountSync.mock.calls[0][0]).toBe(webAccountStorage);
  });
});
