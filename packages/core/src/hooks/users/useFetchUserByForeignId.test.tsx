import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeUser } from "../../test-utils";
import useFetchUserByForeignId from "./useFetchUserByForeignId";

afterEach(() => {
  resetAxiosMocks();
});

describe("useFetchUserByForeignId", () => {
  it("fetches a user by foreign ID", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchUserByForeignId(),
    );

    const user = makeUser({ foreignId: "ext-1" });
    axiosPrivate.mockResponse("get", user);

    let returned: typeof user | undefined;
    await act(async () => {
      returned = await result.current({ foreignId: "ext-1" });
    });

    expect(returned).toEqual(user);

    const [call] = axiosPrivate.calls("get");
    expect(call.url).toBe("/test-project/users/by-foreign-id");
    expect(call.config?.params).toMatchObject({ foreignId: "ext-1" });
  });

  it("rejects when the server returns an error response", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchUserByForeignId(),
    );

    axiosPrivate.mockError("get", 404, { message: "Not found" });

    await expect(
      result.current({ foreignId: "ext-1" }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("throws before making a request when no foreign ID is passed", async () => {
    const { result, axiosPrivate } = renderHookWithAxios(() =>
      useFetchUserByForeignId(),
    );

    await expect(result.current({ foreignId: "" })).rejects.toThrow(
      "Please specify a foreign ID",
    );
    expect(axiosPrivate.calls("get")).toHaveLength(0);
  });
});
