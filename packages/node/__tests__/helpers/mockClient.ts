import { SublayHttpClient } from "../../src/core/client";

export interface MockAxiosInstance {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
}

export interface MockClient {
  client: SublayHttpClient;
  projectInstance: MockAxiosInstance;
  internalInstance: MockAxiosInstance;
  baseInstance: MockAxiosInstance;
}

function makeMockAxiosInstance(): MockAxiosInstance {
  return {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  };
}

/**
 * Builds a `SublayHttpClient`-shaped object with all three axios instances
 * (`projectInstance`/`internalInstance`/`baseInstance`) mocked. Each method
 * defaults to resolving `{ data: {} }`; override per test with
 * `projectInstance.get.mockResolvedValueOnce(...)` (or `mockRejectedValueOnce`
 * for failure-path tests).
 */
export function makeClient(): MockClient {
  const projectInstance = makeMockAxiosInstance();
  const internalInstance = makeMockAxiosInstance();
  const baseInstance = makeMockAxiosInstance();

  return {
    client: {
      projectInstance,
      internalInstance,
      baseInstance,
    } as unknown as SublayHttpClient,
    projectInstance,
    internalInstance,
    baseInstance,
  };
}
