import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";

import { SublayStoreProvider } from "./sublay-store-context";
import { sublayStore } from "../store";
import { setInitialized, resetAuth, setRefreshToken } from "../store/slices/authSlice";
import {
  setAccountsReady,
  clearAllAccounts,
} from "../store/slices/accountsSlice";
import useAxiosPrivate from "../config/useAxiosPrivate";
import axiosPublic, { axiosPrivate } from "../config/axios";
import { resetAuthGate } from "../config/authGate";
import { stubAxiosAdapter, okAxiosResponse, resetAxiosMocks } from "../test-utils";

/**
 * End-to-end guard for the cold-start race that made every viewer-dependent
 * read on an `optionalUserAuth` route silently return stranger-data.
 *
 * The two properties asserted here are in tension, and the whole design rests
 * on keeping both: `children` must render immediately (the provider sits at the
 * root of consumer apps — gating it would blank the entire app, break SSR, and
 * turn a failed bootstrap into a dead page), while their REQUESTS must wait.
 */

const ORIGINAL_PUBLIC_ADAPTER = axiosPublic.defaults.adapter;

afterEach(() => {
  resetAxiosMocks();
  resetAuthGate();
  axiosPublic.defaults.adapter = ORIGINAL_PUBLIC_ADAPTER;
  act(() => {
    sublayStore.dispatch(resetAuth());
    sublayStore.dispatch(setInitialized(false));
    sublayStore.dispatch(clearAllAccounts());
    sublayStore.dispatch(setAccountsReady(false));
  });
});

function jwtExpiringIn(seconds: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode({
    sub: "user-1",
    exp: Math.floor((Date.now() + seconds * 1000) / 1000),
  })}.sig`;
}

describe("auth gate — provider integration", () => {
  it("renders children immediately while holding their mount-time requests until the token lands", async () => {
    const BOOTSTRAPPED_TOKEN = jwtExpiringIn(1800);

    // The bootstrap's own call goes through the PUBLIC instance, so it is never
    // gated by its own gate — hold it open until the assertions below have run.
    let releaseBootstrap!: () => void;
    const bootstrapGate = new Promise<void>((resolve) => {
      releaseBootstrap = resolve;
    });
    axiosPublic.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
      await bootstrapGate;
      return okAxiosResponse(
        {
          accessToken: BOOTSTRAPPED_TOKEN,
          refreshToken: "rotated-refresh",
          user: { id: "user-1" },
        },
        200,
        config,
      );
    }) as never;

    const dataAdapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ entities: [] }, 200, config),
    );
    stubAxiosAdapter(axiosPrivate, dataAdapter);

    // A child that fetches on mount — the shape of every list/feed wrapper.
    const childRendered = vi.fn();
    function FeedChild() {
      const axios = useAxiosPrivate();
      React.useEffect(() => {
        void axios.get("/test-project/entities");
      }, [axios]);
      childRendered();
      return <div data-testid="feed">feed</div>;
    }

    // A refresh token must be present or the bootstrap thunk short-circuits.
    act(() => {
      sublayStore.dispatch(setRefreshToken("stored-refresh"));
    });

    const { getByTestId } = render(
      <SublayStoreProvider projectId="test-project">
        <FeedChild />
      </SublayStoreProvider>,
    );

    // 1. Children are NOT gated — they rendered on the first pass.
    expect(childRendered).toHaveBeenCalled();
    expect(getByTestId("feed").textContent).toBe("feed");

    // 2. Their request is gated — it has not reached the network while the
    //    bootstrap is still in flight. This is the assertion that fails on the
    //    pre-fix code, where the request left with `Bearer null`.
    await Promise.resolve();
    await Promise.resolve();
    expect(dataAdapter).not.toHaveBeenCalled();

    // 3. Once the bootstrap settles, the held request goes out carrying the
    //    token that arrived — not the null it was born with.
    await act(async () => {
      releaseBootstrap();
      await bootstrapGate;
    });

    await waitFor(() => expect(dataAdapter).toHaveBeenCalledTimes(1));
    expect(dataAdapter.mock.calls[0][0].headers.Authorization).toBe(
      `Bearer ${BOOTSTRAPPED_TOKEN}`,
    );
  });

  it("releases held requests even when the bootstrap fails, degrading to anonymous", async () => {
    // `setInitialized(true)` runs in the thunk's `finally`, so a failed
    // bootstrap must not strand every request in the app.
    axiosPublic.defaults.adapter = (async () => {
      throw new Error("network down");
    }) as never;

    const dataAdapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ entities: [] }, 200, config),
    );
    stubAxiosAdapter(axiosPrivate, dataAdapter);

    function FeedChild() {
      const axios = useAxiosPrivate();
      React.useEffect(() => {
        void axios.get("/test-project/entities");
      }, [axios]);
      return <div>feed</div>;
    }

    act(() => {
      sublayStore.dispatch(setRefreshToken("stored-refresh"));
    });

    render(
      <SublayStoreProvider projectId="test-project">
        <FeedChild />
      </SublayStoreProvider>,
    );

    await waitFor(() => expect(dataAdapter).toHaveBeenCalledTimes(1));
  });
});
