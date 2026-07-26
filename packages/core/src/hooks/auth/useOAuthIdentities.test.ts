import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useOAuthIdentities, { type OAuthIdentity } from "./useOAuthIdentities";

afterEach(() => {
  resetAxiosMocks();
});

function makeIdentity(overrides: Partial<OAuthIdentity> = {}): OAuthIdentity {
  return {
    id: "identity-1",
    provider: "google",
    providerAccountId: "google-123",
    email: "alice@example.com",
    name: "Alice",
    avatar: null,
    isVerified: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("useOAuthIdentities", () => {
  it("fetches linked OAuth identities", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useOAuthIdentities());

    const identities = [makeIdentity()];
    axiosPrivate.mockResponse("get", { identities, hasPassword: true });

    expect(result.current.hasPassword).toBe(false);

    await act(async () => {
      await result.current.fetchIdentities();
    });

    expect(result.current.identities).toEqual(identities);
    expect(result.current.hasPassword).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/oauth/identities");
  });

  it("sets an error when fetching fails", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useOAuthIdentities());

    axiosPrivate.mockError("get", 500, { error: "Internal error" });

    await act(async () => {
      await result.current.fetchIdentities();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Internal error");
  });

  it("unlinks an identity and removes it from local state", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useOAuthIdentities());

    axiosPrivate.mockResponse("get", { identities: [makeIdentity({ id: "identity-1" }), makeIdentity({ id: "identity-2", provider: "github" })] });
    await act(async () => {
      await result.current.fetchIdentities();
    });
    expect(result.current.identities).toHaveLength(2);

    axiosPrivate.mockResponse("delete", {});
    await act(async () => {
      await result.current.unlinkIdentity({ identityId: "identity-1" });
    });

    expect(result.current.identities.map((i) => i.id)).toEqual(["identity-2"]);

    const [call] = axiosPrivate.calls("delete");
    expect(call.url).toBe("/test-project/oauth/identities/identity-1");
  });

  it("sets an error when unlinking fails, leaving local state unchanged", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useOAuthIdentities());

    axiosPrivate.mockResponse("get", { identities: [makeIdentity()] });
    await act(async () => {
      await result.current.fetchIdentities();
    });

    axiosPrivate.mockError("delete", 403, { error: "Forbidden" });
    await act(async () => {
      await result.current.unlinkIdentity({ identityId: "identity-1" });
    });

    expect(result.current.error).toBe("Forbidden");
    expect(result.current.identities).toHaveLength(1);
  });

  it("does nothing when there is no project", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() => useOAuthIdentities(), {
      projectId: "",
    });

    await act(async () => {
      await result.current.fetchIdentities();
    });

    expect(axiosPrivate.calls("get")).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });
});
