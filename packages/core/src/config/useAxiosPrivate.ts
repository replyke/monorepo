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

        // No token means genuinely signed out, so send no header at all.
        //
        // This used to emit the literal string `Bearer null`, which was
        // load-bearing before the auth gate existed: a cold-load request left
        // before the token was known, and `requireUserAuth` answers a bare 403
        // to a BAD header but 401 to a MISSING one — and only the 403 drove the
        // refresh-and-retry below. The sentinel was what made recovery fire.
        //
        // The gate removed the premise (requests now wait, so a null token
        // means signed out rather than not-yet-known), and the response
        // interceptor below now treats a bare 401 exactly like a bare 403, so
        // the recovery path survives without it. This also matches what
        // `baseApi.prepareHeaders` has always done on the RTK Query side.
        //
        // Emitting it blocked a server-side fix: `optionalUserAuth` currently
        // tolerates any unverifiable token, which is why an expired one degrades
        // silently to stranger-data. It can only be tightened to reject bad
        // tokens once clients stop sending `null` on public routes, or every
        // signed-out visitor would get a 403 instead of public content.
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
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

        // A *bare* 401/403 (no error code) signals a missing or expired access
        // token: on the data plane those are emitted only by the auth
        // middlewares (requireUserAuth/requireAdminAuth/requireClientAuth) via
        // `sendStatus(401)` for an absent header and `sendStatus(403)` for one
        // that fails verification. Every semantic 401/403 the controllers raise
        // carries a `code` — 403: project/plan-required, project/owner-required,
        // space-permission, user/suspended, auth/no-user-found; 401:
        // space/auth-required, entity/user-required, auth/user-required,
        // push-device/unauthorized, auth/token-reuse-detected, auth/wrong-password.
        // Those are
        // rejections a refresh cannot fix, so we must not rotate the token or
        // retry — doing so would waste a rotation on every such response (e.g.
        // every AI call on a free plan).
        //
        // 401 joins 403 here because the request interceptor above no longer
        // sends `Bearer null`. A signed-out-but-recoverable caller (one holding
        // a refresh token) now produces a bare 401 where it used to produce a
        // bare 403, and that path must still recover. When there is nothing to
        // refresh with, `refreshAccessToken` resolves undefined and the original
        // error is rejected — same outcome as before, one round trip either way.
        const isBareAuthFailure =
          (status === 401 || status === 403) && !data?.code;
        if (isBareAuthFailure && !prevRequest?.sent) {
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
