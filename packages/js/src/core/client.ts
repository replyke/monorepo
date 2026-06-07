import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = "https://api.sublay.io/v7";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ClientConfig {
  projectId: string;
  /**
   * Optional tokens to hydrate the SDK on init (SDK-managed mode) — e.g. tokens
   * the host app persisted from a previous session.
   */
  initialTokens?: AuthTokens;
  /**
   * Optional async hook returning the current access token. **Providing it puts
   * the SDK in "host-managed" mode**: the host owns the token and its refresh,
   * and the SDK never stores or refreshes tokens itself.
   */
  getToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  /**
   * Called whenever the SDK sets, rotates, or clears tokens (SDK-managed mode
   * only). Receives `null` on sign-out. Use it to persist tokens so a session
   * survives a reload.
   */
  onAuthChange?: (tokens: AuthTokens | null) => void;
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export class SublayHttpClient {
  projectInstance: AxiosInstance;

  private readonly baseURL: string;
  private readonly hostManaged: boolean;
  private readonly getToken?: ClientConfig["getToken"];
  private readonly onAuthChange?: ClientConfig["onAuthChange"];

  private accessToken: string | null;
  private refreshToken: string | null;
  /** Shared so concurrent 403s trigger a single refresh (mutex). */
  private refreshPromise: Promise<string | null> | null = null;

  constructor({
    projectId,
    initialTokens,
    getToken,
    onAuthChange,
  }: ClientConfig) {
    this.baseURL = `${BASE_URL}/${projectId}`;
    this.getToken = getToken;
    this.onAuthChange = onAuthChange;
    this.hostManaged = Boolean(getToken);
    this.accessToken = initialTokens?.accessToken ?? null;
    this.refreshToken = initialTokens?.refreshToken ?? null;

    this.projectInstance = axios.create({
      baseURL: this.baseURL,
      headers: { "Content-Type": "application/json" },
    });

    // Request: attach the bearer token. An explicit Authorization header on a
    // request always wins. Host-managed mode reads from getToken; SDK-managed
    // mode reads the in-memory token.
    this.projectInstance.interceptors.request.use(async (config) => {
      if (config.headers.Authorization) return config;
      const token = this.hostManaged
        ? await this.getToken?.()
        : this.accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Response: on 403, refresh once and retry the original request.
    this.projectInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config as RetryableConfig | undefined;
        const status = error?.response?.status;
        if (status !== 403 || !prevRequest || prevRequest._retry) {
          return Promise.reject(error);
        }
        prevRequest._retry = true;

        let newToken: string | null | undefined = null;
        if (this.hostManaged) {
          // The host owns refresh; re-read getToken once in case it rotated.
          // If the token is unchanged or absent, surface the original error.
          const fresh = await this.getToken?.();
          if (
            fresh &&
            `Bearer ${fresh}` !== prevRequest.headers?.Authorization
          ) {
            newToken = fresh;
          }
        } else {
          newToken = await this.refreshAccessToken();
        }

        if (!newToken) return Promise.reject(error);
        prevRequest.headers.Authorization = `Bearer ${newToken}`;
        return this.projectInstance(prevRequest);
      }
    );
  }

  /**
   * The SDK's own in-memory access token (SDK-managed mode). Distinct from the
   * `init({ getToken })` host hook, which supplies a token in host-managed mode.
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Store a full token pair (SDK-managed mode only; no-op when host-managed). */
  setTokens(tokens: AuthTokens): void {
    if (this.hostManaged) return;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.onAuthChange?.({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    });
  }

  /** Update just the access token, e.g. after a refresh (no-op when host-managed). */
  setAccessToken(accessToken: string): void {
    if (this.hostManaged) return;
    this.accessToken = accessToken;
    if (this.refreshToken) {
      this.onAuthChange?.({ accessToken, refreshToken: this.refreshToken });
    }
  }

  /** Clear tokens and notify with null (SDK-managed mode only). */
  clearTokens(): void {
    if (this.hostManaged) return;
    this.accessToken = null;
    this.refreshToken = null;
    this.onAuthChange?.(null);
  }

  /**
   * Refresh the access token using the in-memory refresh token. A single shared
   * promise (mutex) means concurrent 403s trigger only one network refresh. The
   * call goes through a bare axios (not `projectInstance`) so it never re-enters
   * the response interceptor. Returns the new access token, or null on failure.
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) return null;
    if (!this.refreshPromise) {
      const refreshToken = this.refreshToken;
      this.refreshPromise = axios
        .post<{ accessToken: string }>(
          `${this.baseURL}/auth/request-new-access-token`,
          { refreshToken }
        )
        .then((res) => {
          const token = res.data.accessToken;
          this.setAccessToken(token);
          return token;
        })
        .catch(() => null)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }
}
