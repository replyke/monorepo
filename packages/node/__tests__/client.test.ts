import axios from "axios";
import { SublayHttpClient } from "../src/core/client";
import { SublayClient } from "../src/index";

jest.mock("axios");

const mockedCreate = axios.create as jest.Mock;

describe("SublayHttpClient construction", () => {
  it("configures projectInstance with the v7 project-scoped baseURL and auth headers", () => {
    new SublayHttpClient({ projectId: "proj1", apiKey: "key1" });

    expect(mockedCreate).toHaveBeenNthCalledWith(1, {
      baseURL: "https://api.sublay.io/v7/proj1",
      headers: {
        Authorization: "Bearer key1",
        "X-Sublay-Project-ID": "proj1",
      },
    });
  });

  it("configures internalInstance with the /internal baseURL and the same auth headers", () => {
    new SublayHttpClient({ projectId: "proj1", apiKey: "key1" });

    expect(mockedCreate).toHaveBeenNthCalledWith(2, {
      baseURL: "https://api.sublay.io/internal",
      headers: {
        Authorization: "Bearer key1",
        "X-Sublay-Project-ID": "proj1",
      },
    });
  });

  it("configures baseInstance with the bare API root and no auth headers", () => {
    new SublayHttpClient({ projectId: "proj1", apiKey: "key1" });

    expect(mockedCreate).toHaveBeenNthCalledWith(3, {
      baseURL: "https://api.sublay.io",
    });
  });

  it("adds the X-Sublay-Internal header to projectInstance/internalInstance when isInternal is true", () => {
    new SublayHttpClient({ projectId: "proj1", apiKey: "key1", isInternal: true });

    expect(mockedCreate).toHaveBeenNthCalledWith(1, {
      baseURL: "https://api.sublay.io/v7/proj1",
      headers: {
        Authorization: "Bearer key1",
        "X-Sublay-Project-ID": "proj1",
        "X-Sublay-Internal": "true",
      },
    });
    expect(mockedCreate).toHaveBeenNthCalledWith(2, {
      baseURL: "https://api.sublay.io/internal",
      headers: {
        Authorization: "Bearer key1",
        "X-Sublay-Project-ID": "proj1",
        "X-Sublay-Internal": "true",
      },
    });
  });

  it("omits X-Sublay-Internal when isInternal is false/omitted", () => {
    new SublayHttpClient({ projectId: "proj1", apiKey: "key1", isInternal: false });

    const [projectConfig] = mockedCreate.mock.calls[0];
    expect(projectConfig.headers).not.toHaveProperty("X-Sublay-Internal");
  });
});

/** Makes `axios.create` return a distinct mocked instance per baseURL, so the
 *  `/internal` instance's `get` can be controlled independently of the others. */
function mockAxiosCreate(internalGet: jest.Mock) {
  mockedCreate.mockImplementation((config?: { baseURL?: string }) => {
    const isInternalInstance = config?.baseURL?.endsWith("/internal");
    return {
      get: isInternalInstance ? internalGet : jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      patch: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({ data: {} }),
    };
  });
}

describe("SublayClient.init / verifyClient", () => {
  it("resolves with a working, fully bound client when /service/verify succeeds", async () => {
    const internalGet = jest.fn().mockResolvedValue({ data: { ok: true } });
    mockAxiosCreate(internalGet);

    const client = await SublayClient.init({ projectId: "p1", apiKey: "k1" });

    expect(internalGet).toHaveBeenCalledWith("/service/verify");
    expect(typeof client.entities.fetchEntity).toBe("function");
    expect(typeof client.table("Events").find).toBe("function");
  });

  it("rejects with a descriptive error when /service/verify fails", async () => {
    const internalGet = jest.fn().mockRejectedValue(new Error("network fail"));
    mockAxiosCreate(internalGet);

    await expect(
      SublayClient.init({ projectId: "p1", apiKey: "k1" }),
    ).rejects.toThrow("[Sublay] Invalid API key or project ID.");
  });
});
