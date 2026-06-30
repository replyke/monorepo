import { SublayHttpClient } from "../../core/client";
import { ContentSearchResult } from "./searchContent";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface AskContentProps extends SpaceReputationContextParams {
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
  /** Abort the in-flight stream (e.g. when the user navigates away). */
  signal?: AbortSignal;
}

/**
 * A single Server-Sent Event from the `askContent` stream.
 * - `token`   — an incremental chunk of the answer text.
 * - `sources` — the hydrated source records, emitted once after the answer.
 * - `done`    — the stream finished successfully.
 * - `error`   — the server reported an error (the stream ends after this).
 */
export type AskContentEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: ContentSearchResult[] }
  | { type: "done" }
  | { type: "error"; error: string };

function parseSseBlock(block: string): AskContentEvent | null {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!event) return null;

  let payload: any = undefined;
  if (data) {
    try {
      payload = JSON.parse(data);
    } catch {
      payload = undefined;
    }
  }

  switch (event) {
    case "token":
      return { type: "token", content: payload?.content ?? "" };
    case "sources":
      return {
        type: "sources",
        sources: Array.isArray(payload) ? payload : [],
      };
    case "done":
      return { type: "done" };
    case "error":
      return { type: "error", error: payload?.error ?? "Unknown error" };
    default:
      return null;
  }
}

/**
 * Ask a question over your project's content (semantic RAG). The server answers
 * by streaming Server-Sent Events, so this is an **async generator**: iterate it
 * to consume the answer as it arrives.
 *
 * ```ts
 * let answer = "";
 * for await (const ev of client.search.askContent({ query: "How do refunds work?" })) {
 *   if (ev.type === "token") answer += ev.content;
 *   else if (ev.type === "sources") console.log("sources:", ev.sources);
 *   else if (ev.type === "error") throw new Error(ev.error);
 * }
 * ```
 *
 * Cancel by passing an `AbortSignal`, or by `break`ing out of the loop.
 *
 * Note: this request uses `fetch` (not the axios instance), so it does not get
 * the automatic 403→refresh retry. The token is read fresh at call time via the
 * client's active auth mode.
 */
export async function* askContent(
  client: SublayHttpClient,
  data: AskContentProps
): AsyncGenerator<AskContentEvent, void, unknown> {
  // The server reads the space-reputation options from `req.query`, not the
  // request body, so they are appended to the URL as query params.
  const { signal, spaceReputationId, spaceReputationDescendants, ...body } =
    data;

  const baseURL = client.projectInstance.defaults.baseURL ?? "";
  const authHeader = await client.getAuthHeader();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) headers.Authorization = authHeader;

  const search = new URLSearchParams();
  if (spaceReputationId != null)
    search.set("spaceReputationId", spaceReputationId);
  if (spaceReputationDescendants != null)
    search.set(
      "spaceReputationDescendants",
      String(spaceReputationDescendants)
    );
  const queryString = search.toString();
  const url = `${baseURL}/search/ask${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Request failed with status ${response.status}`;
    try {
      const json = await response.json();
      message = json?.error ?? message;
    } catch {
      // non-JSON error body; keep the status-based message
    }
    yield { type: "error", error: message };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by a blank line ("\n\n").
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const rawBlock = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseBlock(rawBlock);
        if (event) yield event;
      }
    }

    // Flush any trailing event not terminated by a blank line.
    const tail = buffer.trim();
    if (tail) {
      const event = parseSseBlock(tail);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}
