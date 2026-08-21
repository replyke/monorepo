import { describe, it, expect, afterEach } from "vitest";

import { resetAxiosMocks, stubAxiosAdapter, okAxiosResponse } from "../test-utils";
import axiosPublic, { axiosPrivate, BASE_URL, REQUEST_TIMEOUT_MS } from "./axios";

afterEach(() => {
  resetAxiosMocks();
});

describe("config/axios", () => {
  it("configures the public instance with the API base URL", () => {
    expect(axiosPublic.defaults.baseURL).toBe(BASE_URL);
  });

  it("configures axiosPrivate with the same base URL and a JSON content type", () => {
    expect(axiosPrivate.defaults.baseURL).toBe(BASE_URL);
    expect(axiosPrivate.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("exposes two distinct instances", () => {
    expect(axiosPrivate).not.toBe(axiosPublic);
  });

  it("gives the public instance a finite request timeout", () => {
    // Without one, a connection that is accepted and never answered leaves the
    // promise pending forever. On the credential-exchange path that pins the
    // single-flight entry and the lease permanently: the account cannot be
    // switched into again without an app restart.
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(REQUEST_TIMEOUT_MS)).toBe(true);
    expect(axiosPublic.defaults.timeout).toBe(REQUEST_TIMEOUT_MS);
  });

  it("carries that timeout into every request the public instance issues", () => {
    // The default is only worth anything if axios merges it into the per-request
    // config the adapter enforces. Asserted through a real request so the
    // instance default and the request that actually goes out cannot drift.
    let seen: unknown;
    stubAxiosAdapter(axiosPublic, async (config) => {
      seen = config.timeout;
      return okAxiosResponse({}, 200, config);
    });

    return axiosPublic.get("/anything").then(() => {
      expect(seen).toBe(REQUEST_TIMEOUT_MS);
    });
  });
});
