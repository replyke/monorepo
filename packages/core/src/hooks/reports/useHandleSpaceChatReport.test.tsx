import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useHandleSpaceChatReport from "./useHandleSpaceChatReport";

afterEach(() => {
  resetAxiosMocks();
});

describe("useHandleSpaceChatReport", () => {
  it("submits a moderation decision for a chat report", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useHandleSpaceChatReport(),
    );

    const response = { message: "Report handled", code: "OK" };
    axiosPrivate.mockResponse("patch", response);

    let returned: typeof response | undefined;
    await act(async () => {
      returned = await result.current({
        spaceId: "space-1",
        reportId: "report-1",
        messageId: "message-1",
        actions: ["remove-message"],
        summary: "Removed abusive message",
      });
    });

    expect(returned).toEqual(response);

    const [call] = axiosPrivate.calls("patch");
    expect(call.url).toBe("/test-project/spaces/space-1/chat/reports/report-1");
    expect(call.body).toMatchObject({
      messageId: "message-1",
      actions: ["remove-message"],
      summary: "Removed abusive message",
    });
  });

  it("supports combining ban-user with remove-message, attributing the moderator", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useHandleSpaceChatReport(),
    );

    axiosPrivate.mockResponse("patch", { message: "ok", code: "OK" });

    await act(async () => {
      await result.current({
        spaceId: "space-1",
        reportId: "report-1",
        messageId: "message-1",
        actions: ["remove-message", "ban-user"],
        // userId is the ban target; actingUserId is the moderator.
        userId: "user-2",
        reason: "Repeated harassment",
        actingUserId: "moderator-1",
      });
    });

    const [call] = axiosPrivate.calls("patch");
    expect(call.body).toMatchObject({
      actions: ["remove-message", "ban-user"],
      userId: "user-2",
      reason: "Repeated harassment",
      actingUserId: "moderator-1",
    });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useHandleSpaceChatReport(),
    );

    axiosPrivate.mockError("patch", 403, { message: "Forbidden" });

    await expect(
      result.current({
        spaceId: "space-1",
        reportId: "report-1",
        actions: ["dismiss"],
      }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("throws before making a request when spaceId or reportId is missing", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useHandleSpaceChatReport(),
    );

    await expect(
      result.current({
        spaceId: "",
        reportId: "report-1",
        actions: ["dismiss"],
      }),
    ).rejects.toThrow("spaceId and reportId are required");
    expect(axiosPrivate.calls("patch")).toHaveLength(0);
  });
});
