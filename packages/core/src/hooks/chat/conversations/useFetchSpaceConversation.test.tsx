import { describe, it, expect, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeConversation } from "../../../test-utils";
import useFetchSpaceConversation from "./useFetchSpaceConversation";
import { selectConversation } from "../../../store/slices/chatSlice";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchSpaceConversation", () => {
  it("fetches a space's conversation on mount and stores it in the chat slice", async () => {
    const conversation = makeConversation({ type: "space", spaceId: "space-1" });

    const { result, store, axiosPrivate } = renderHookWithAxios(
      () => useFetchSpaceConversation({ spaceId: "space-1" }),
      {
        beforeRender: ({ axiosPrivate }) => axiosPrivate.mockResponse("get", conversation),
      },
    );

    await waitFor(() => expect(result.current.conversation).toEqual(conversation));
    expect(result.current.loading).toBe(false);
    expect(selectConversation(conversation.id)(store.getState())).toEqual(conversation);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/spaces/space-1/conversation");
  });

  it("does not throw and leaves conversation unset when the fetch fails", async () => {
    const { result } = renderHookWithAxios(
      () => useFetchSpaceConversation({ spaceId: "space-1" }),
      {
        beforeRender: ({ axiosPrivate }) =>
          axiosPrivate.mockError("get", 500, { message: "Internal error" }),
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversation).toBeNull();
  });

  it("does not fetch when there is no space ID", () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchSpaceConversation({ spaceId: "" }),
    );

    expect(result.current.loading).toBe(false);
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
