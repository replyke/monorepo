import { useCallback, useEffect, useRef, useState } from "react";
import useProject from "../projects/useProject";
import useAuth from "../auth/useAuth";
import { BASE_URL } from "../../config/axios";
import { refreshAccessToken } from "../../config/refreshAccessToken";
import { ContentSearchResult } from "./useSearchContent";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

function safeParseJson(text: string): { error?: string; code?: string } | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface UseAskContentProps extends SpaceReputationContextParams {
  query: string;
  sourceTypes?: ("entity" | "comment" | "message")[];
  spaceId?: string;
  /**
   * With a `spaceId`, also search every space nested under it (children,
   * grandchildren — the whole subtree, any depth). Ignored without a `spaceId`.
   * Defaults to false (exact-space search).
   */
  includeChildSpaces?: boolean;
  conversationId?: string;
  limit?: number;
}

export interface UseAskContentReturn {
  /** Answer text — grows as token events arrive */
  answer: string;
  /** Hydrated source records — set once after streaming completes */
  sources: ContentSearchResult[];
  /** True while the SSE stream is open and tokens are arriving */
  streaming: boolean;
  /** True from the ask() call until the first token arrives (or an error occurs) */
  loading: boolean;
  error: string | null;
  ask: (props: UseAskContentProps) => void;
  /** Aborts any in-flight stream and resets all state */
  reset: () => void;
}

interface SseEvent {
  event: string;
  data: string;
}

/**
 * Parses raw SSE text from a ReadableStream chunk. Because TCP packets don't
 * align with SSE event boundaries, we maintain a buffer of incomplete text
 * across calls and return the leftover for the next iteration.
 */
function parseSseChunk(buffer: string): { events: SseEvent[]; remainder: string } {
  const events: SseEvent[] = [];
  // Events are delimited by a blank line (\n\n)
  const blocks = buffer.split("\n\n");
  // The last element is either empty (buffer ended cleanly) or an incomplete
  // block that hasn't received its terminating \n\n yet — keep it for next call.
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (data) events.push({ event, data });
  }

  return { events, remainder };
}

export default function useAskContent(): UseAskContentReturn {
  const { projectId } = useProject();
  const { accessToken, requestNewAccessToken } = useAuth();

  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<ContentSearchResult[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held across renders so reset() and unmount cleanup can abort an in-flight stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort stream on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAnswer("");
    setSources([]);
    setStreaming(false);
    setLoading(false);
    setError(null);
  }, []);

  const ask = useCallback(
    ({ query, sourceTypes, spaceId, includeChildSpaces, conversationId, limit, spaceReputation, spaceReputationId, spaceReputationDescendants }: UseAskContentProps) => {
      if (!projectId) return;
      if (!query.trim()) return;

      // Cancel any previous stream before starting a new one
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Reset output state for the new query
      setAnswer("");
      setSources([]);
      setError(null);
      setLoading(true);
      setStreaming(false);

      const body = JSON.stringify({
        query,
        ...(sourceTypes && { sourceTypes }),
        ...(spaceId && { spaceId }),
        ...(includeChildSpaces && { includeChildSpaces }),
        ...(conversationId && { conversationId }),
        ...(limit && { limit }),
      });

      // Run async without blocking the render cycle — errors are surfaced via state
      // spaceReputation opt-in is read from the query string by the server,
      // not the request body — append it to the URL.
      const queryString = (() => {
        const reputationParams = buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        });
        const sp = new URLSearchParams();
        if (reputationParams.spaceReputationId !== undefined)
          sp.set("spaceReputationId", reputationParams.spaceReputationId);
        if (reputationParams.spaceReputationDescendants !== undefined)
          sp.set(
            "spaceReputationDescendants",
            String(reputationParams.spaceReputationDescendants)
          );
        const s = sp.toString();
        return s ? `?${s}` : "";
      })();

      // `reactNative.textStreaming` opts react-native-fetch-api into incremental
      // streaming, so `response.body` is a progressively-readable stream rather
      // than a buffered blob resolved only at completion. It's an unknown key to
      // standard/web `fetch`, which ignores extra RequestInit fields, so we send
      // it unconditionally instead of branching on platform.
      const doFetch = (token: string | null | undefined) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const init: RequestInit & { reactNative?: { textStreaming?: boolean } } = {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
          reactNative: { textStreaming: true },
        };
        return fetch(`${BASE_URL}/${projectId}/search/ask${queryString}`, init);
      };

      (async () => {
        try {
          let response = await doFetch(accessToken);

          // A *bare* 403 (no error code) means the access token expired/invalid
          // — the same signal `requireUserAuth` emits. Unlike the axios hooks,
          // this raw-fetch stream can't lean on the interceptor, so refresh once
          // (coalesced with the interceptor via the shared single-flight) and
          // retry. Coded 403s (project/plan-required, user/suspended, …) are
          // semantic and unrecoverable by refresh, so surface them as-is. A 401
          // (no token at all) is likewise unrecoverable and falls through below.
          if (response.status === 403) {
            const text = await response.text().catch(() => "");
            const parsed = safeParseJson(text);
            if (parsed?.code) {
              setError(parsed.error ?? "Request failed (403)");
              setLoading(false);
              return;
            }
            const newToken = await refreshAccessToken(requestNewAccessToken);
            if (!newToken) {
              setError("Your session has expired. Please sign in again.");
              setLoading(false);
              return;
            }
            response = await doFetch(newToken);
          }

          if (response.status === 401) {
            setError("You must be signed in to use AI search.");
            setLoading(false);
            return;
          }

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            const message = (() => {
              try {
                return JSON.parse(text)?.error ?? `Request failed (${response.status})`;
              } catch {
                return `Request failed (${response.status})`;
              }
            })();
            setError(message);
            setLoading(false);
            return;
          }

          if (!response.body) {
            setError(
              "Streaming is not supported in this environment. " +
              "In React Native, install react-native-fetch-api, web-streams-polyfill@^3, " +
              "react-native-polyfill-globals, and text-encoding, then at app startup call the " +
              "targeted sub-polyfills — polyfill() from react-native-polyfill-globals/src/encoding, " +
              "/readable-stream, and /fetch (in that order). " +
              "Prefer these over the all-in-one polyfillGlobals(), which also pulls the native " +
              "react-native-get-random-values and forces a dev-client rebuild."
            );
            setLoading(false);
            return;
          }

          setStreaming(true);
          setLoading(false);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const { events, remainder } = parseSseChunk(buffer);
            buffer = remainder;

            for (const { event, data } of events) {
              if (event === "token") {
                const parsed = JSON.parse(data) as { content: string };
                setAnswer((prev) => prev + parsed.content);
              } else if (event === "sources") {
                const parsed = JSON.parse(data) as ContentSearchResult[];
                setSources(parsed);
              } else if (event === "done") {
                setStreaming(false);
              } else if (event === "error") {
                const parsed = JSON.parse(data) as { error: string };
                setError(parsed.error);
                setStreaming(false);
              }
            }
          }

          // Ensure streaming is cleared if the connection closes without a done event
          setStreaming(false);
        } catch (err) {
          if ((err as Error).name === "AbortError") return; // user called reset()
          setError("An unexpected error occurred");
          setStreaming(false);
          setLoading(false);
        }
      })();
    },
    [projectId, accessToken, requestNewAccessToken]
  );

  return { answer, sources, streaming, loading, error, ask, reset };
}
