import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
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
}

/**
 * Builds a `SublayHttpClient`-shaped object with `projectInstance` mocked.
 * Each method defaults to resolving `{ data: {} }`; override per test with
 * `projectInstance.get.mockResolvedValueOnce(...)` (or `mockRejectedValueOnce`
 * for failure-path tests). This bypasses the real auth-header/refresh
 * interceptors entirely — it's for module request-shaping/response-mapping
 * tests, not for testing `SublayHttpClient` itself. For that, use
 * `stubAdapter` below against a real client instance (either auth mode).
 */
export function makeClient(): MockClient {
  const projectInstance: MockAxiosInstance = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  };

  return {
    client: { projectInstance } as unknown as SublayHttpClient,
    projectInstance,
  };
}

/** Flattens a `FormData` into a plain object for assertions on multipart bodies. */
export function formDataToObject(
  formData: FormData
): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

export type AxiosAdapter = (
  config: InternalAxiosRequestConfig
) => Promise<AxiosResponse>;

function toAxiosResponse<T>(
  data: T,
  status: number,
  config: InternalAxiosRequestConfig = {} as never
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    headers: {},
    config,
  };
}

function toAxiosError(
  status: number,
  data?: unknown,
  config: InternalAxiosRequestConfig = {} as never
): AxiosError {
  const error = new Error(
    `Request failed with status code ${status}`
  ) as AxiosError;
  error.isAxiosError = true;
  error.response = toAxiosResponse(data, status, config);
  error.config = config;
  error.toJSON = () => ({});
  return error;
}

export const okAxiosResponse = toAxiosResponse;
export const axiosErrorWithStatus = toAxiosError;

/**
 * Installs a custom adapter on a real axios instance (e.g. a
 * `SublayHttpClient`'s `projectInstance`) so its interceptors run for real
 * while the actual network call is replaced. Use this to exercise
 * `SublayHttpClient`'s own auth-header injection and 403-refresh-retry logic
 * — construct a real client with `new SublayHttpClient(config)`, then stub
 * its `projectInstance`. Build responses/errors with `okAxiosResponse`/
 * `axiosErrorWithStatus` so the resolved/rejected value carries the request
 * `config` through (the retry interceptor reuses it to re-issue the request).
 */
export function stubAdapter(instance: AxiosInstance, adapter: AxiosAdapter): void {
  instance.defaults.adapter = adapter as never;
}
