import { describe, it, expect, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../test-utils";
import useCreateReport from "./useCreateReport";

afterEach(() => {
  resetAxiosMocks();
});

describe("useCreateReport", () => {
  it("creates a comment report", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateReport({ type: "comment" }),
      { user },
    );

    axiosPrivate.mockResponse("post", undefined, 201);

    await act(async () => {
      await result.current({ targetId: "comment-1", reason: "spam" });
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.url).toBe("/test-project/reports");
    expect(call.body).toMatchObject({
      targetId: "comment-1",
      targetType: "comment",
      reason: "spam",
    });
  });

  it("creates an entity report with details", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateReport({ type: "entity" }),
      { user },
    );

    axiosPrivate.mockResponse("post", undefined, 201);

    await act(async () => {
      await result.current({
        targetId: "entity-1",
        reason: "harassment",
        details: "Targeted abuse",
      });
    });

    const [call] = axiosPrivate.calls("post");
    expect(call.body).toMatchObject({
      targetId: "entity-1",
      targetType: "entity",
      reason: "harassment",
      details: "Targeted abuse",
    });
  });

  it("creates a message report against the shared reports endpoint", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateReport({ type: "message" }),
      { user },
    );

    axiosPrivate.mockResponse("post", undefined, 201);

    await act(async () => {
      await result.current({ targetId: "message-1", reason: "hateSpeech" });
    });

    const [call] = axiosPrivate.calls("post");
    // Chat message reports go through /reports, not a chat-local route, and
    // carry no conversationId — the server resolves it from the message.
    expect(call.url).toBe("/test-project/reports");
    expect(call.body).toMatchObject({
      targetId: "message-1",
      targetType: "message",
      reason: "hateSpeech",
    });
    expect(call.body).not.toHaveProperty("conversationId");
  });

  it("throws when constructed with an invalid type", () => {
    const user = makeAuthUser();
    // React + jsdom log the error to console even though it's caught below —
    // silence that expected noise for this one test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      renderHookWithAxios(() => useCreateReport({ type: "bogus" as any }), { user }),
    ).toThrow("Invalid report type");

    consoleSpy.mockRestore();
  });

  it("rejects when the server returns an error response", async () => {
    const user = makeAuthUser();
    const { result, axiosPrivate } = renderHookWithAxios(
      () => useCreateReport({ type: "comment" }),
      { user },
    );

    axiosPrivate.mockError("post", 500, { message: "Internal error" });

    await expect(
      result.current({ targetId: "comment-1", reason: "spam" }),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("throws before making a request when there is no authenticated user", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useCreateReport({ type: "comment" }),
    );

    await expect(
      result.current({ targetId: "comment-1", reason: "spam" }),
    ).rejects.toThrow("No user is logged in");
    expect(axiosPrivate.calls("post")).toHaveLength(0);
  });
});
