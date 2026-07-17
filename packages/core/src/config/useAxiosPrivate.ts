import { useEffect } from "react";
import type { AxiosInstance } from "axios";
import { axiosPrivate } from "./axios";
import { useAuth } from "../hooks/auth";
import {
  SUSPENDED_ERROR_CODE,
  SuspendedError,
} from "../errors/SuspendedError";

// Module-level mutex: prevents concurrent token rotations from racing
let refreshPromise: Promise<string | undefined> | null = null;

const useAxiosPrivate = (): AxiosInstance => {
  const { accessToken, requestNewAccessToken } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        if (config.headers["Authorization"]) return config;
        config.headers["Authorization"] = `Bearer ${accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;

        // A suspension 403 must be discriminated BEFORE the generic
        // 403 → token-refresh branch below. Otherwise a blocked write would
        // spuriously rotate the token and silently retry the request. Reject
        // with a typed, catchable error carrying reason/endDate instead.
        if (
          error?.response?.status === 403 &&
          error?.response?.data?.code === SUSPENDED_ERROR_CODE
        ) {
          const data = error.response.data;
          return Promise.reject(
            new SuspendedError({
              message: data?.error,
              reason: data?.reason ?? null,
              endDate: data?.endDate ?? null,
            })
          );
        }

        if (error?.response?.status === 403 && !prevRequest?.sent) {
          prevRequest.sent = true;

          // Use mutex to prevent concurrent rotation races
          if (!refreshPromise) {
            refreshPromise = requestNewAccessToken?.()?.finally(() => {
              refreshPromise = null;
            }) ?? Promise.resolve(undefined);
          }

          const newAccessToken = await refreshPromise;

          if (!newAccessToken) {
            return Promise.reject(error);
          }

          prevRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return axiosPrivate(prevRequest);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [accessToken, requestNewAccessToken]);

  return axiosPrivate;
};

export default useAxiosPrivate;
