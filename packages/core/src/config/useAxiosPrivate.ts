import { useEffect } from "react";
import type { AxiosInstance } from "axios";
import { axiosPrivate } from "./axios";
import { refreshAccessToken } from "./refreshAccessToken";
import { getAuthorizedToken } from "./authGate";
import { useAuth } from "../hooks/auth";
import {
  SUSPENDED_ERROR_CODE,
  SuspendedError,
} from "../errors/SuspendedError";

const useAxiosPrivate = (): AxiosInstance => {
  const { accessToken, requestNewAccessToken } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      async (config) => {
        if (config.headers["Authorization"]) return config;

        // Awaited, not read from this closure. A request fired on mount runs
        // through an interceptor registered before the bootstrap resolved, so
        // `accessToken` here is null and stays null — see authGate.ts. The gate
        // resolves immediately once auth is ready (and instantly when no
        // provider armed it), so this costs nothing after cold start.
        const token = await getAuthorizedToken(accessToken);

        // Deliberately still `Bearer null` when signed out. `requireUserAuth`
        // answers 401 to a MISSING header and a bare 403 to a bad one, and only
        // the 403 drives the refresh-and-retry below. Dropping the header here
        // would silently break cold-load recovery on every route that relies on
        // it. `optionalUserAuth` ignores an unparseable token either way.
        config.headers["Authorization"] = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        const status = error?.response?.status;
        const data = error?.response?.data;

        // A suspension 403 must be discriminated BEFORE the refresh branch
        // below. Otherwise a blocked write would spuriously rotate the token and
        // silently retry the request. Reject with a typed, catchable error
        // carrying reason/endDate instead.
        if (status === 403 && data?.code === SUSPENDED_ERROR_CODE) {
          return Promise.reject(
            new SuspendedError({
              message: data?.error,
              reason: data?.reason ?? null,
              endDate: data?.endDate ?? null,
            })
          );
        }

        // A *bare* 403 (no error code) signals an expired/invalid access token:
        // on the data plane that's emitted only by the auth middlewares
        // (requireUserAuth/requireAdminAuth/requireClientAuth) via
        // `sendStatus(403)` — every semantic 403 the controllers raise carries a
        // `code` (project/plan-required, project/owner-required, space-permission,
        // user/suspended, auth/no-user-found, …). Those are rejections a refresh
        // cannot fix, so we must not rotate the token or retry — doing so would
        // waste a rotation on every such response (e.g. every AI call on a free
        // plan).
        if (status === 403 && !data?.code && !prevRequest?.sent) {
          prevRequest.sent = true;

          const newAccessToken = await refreshAccessToken(requestNewAccessToken);
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
