import { send } from "../src/modules/push";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk push — request shaping", () => {
  it("send posts the full body to /push-notifications/send with no reshaping", async () => {
    const { client, projectInstance } = makeClient();
    await send(client, {
      userIds: ["u1", "u2"],
      title: "New message",
      body: "You have a new message",
      data: { conversationId: "c1" },
    });

    expect(projectInstance.post).toHaveBeenCalledWith("/push-notifications/send", {
      userIds: ["u1", "u2"],
      title: "New message",
      body: "You have a new message",
      data: { conversationId: "c1" },
    });
  });

  it("send returns the typed response passed through as-is", async () => {
    const { client, projectInstance } = makeClient();
    const responseBody = {
      results: {
        u1: [{ platform: "ios", success: true }],
        u2: [],
      },
    };
    projectInstance.post.mockResolvedValueOnce({ data: responseBody });

    const result = await send(client, { userIds: ["u1", "u2"], title: "Hi", body: "There" });

    expect(result).toEqual(responseBody);
  });
});
