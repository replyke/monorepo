import {
  deleteFollow,
  fetchFollowers,
  fetchFollowersCount,
  fetchFollowing,
  fetchFollowingCount,
} from "../src/modules/follows";
import { makeClient } from "./helpers/client";

describe("js-sdk follows (own graph) — request shaping", () => {
  it("fetchFollowers gets /follows/followers with page/limit as params (no userId — own graph)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowers(client, { page: 1, limit: 20 });
    expect(projectInstance.get).toHaveBeenCalledWith("/follows/followers", {
      params: { page: 1, limit: 20 },
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("userId");
  });

  it("fetchFollowing gets /follows/following with page/limit as params (no userId — own graph)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowing(client, { page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith("/follows/following", {
      params: { page: 2, limit: 10 },
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("userId");
  });

  it("fetchFollowersCount gets /follows/followers-count with no params (no userId — own graph)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowersCount(client);
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/follows/followers-count"
    );
    const call = projectInstance.get.mock.calls[0];
    expect(call.length).toBe(1);
  });

  it("fetchFollowingCount gets /follows/following-count with no params (no userId — own graph)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowingCount(client);
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/follows/following-count"
    );
    const call = projectInstance.get.mock.calls[0];
    expect(call.length).toBe(1);
  });

  it("deleteFollow deletes /follows/:followId with no params (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await deleteFollow(client, { followId: "f1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/follows/f1");
    const call = projectInstance.delete.mock.calls[0];
    expect(call.length).toBe(1);
  });
});

describe("js-sdk follows (own graph) — response mapping", () => {
  it("fetchFollowers returns the full PaginatedResponse<FollowListItem> envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        {
          followId: "f1",
          user: { id: "u1", username: "alice" },
          followedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchFollowers(client, { page: 1 });

    expect(result).toEqual(envelope);
  });

  it("fetchFollowing returns the full PaginatedResponse<FollowListItem> envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        {
          followId: "f2",
          user: { id: "u2", username: "bob" },
          followedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchFollowing(client, { page: 1 });

    expect(result).toEqual(envelope);
  });

  it("fetchFollowersCount returns the count wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { count: 42 } });

    const result = await fetchFollowersCount(client);

    expect(result).toEqual({ count: 42 });
  });

  it("fetchFollowingCount returns the count wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { count: 7 } });

    const result = await fetchFollowingCount(client);

    expect(result).toEqual({ count: 7 });
  });

  it("deleteFollow resolves to undefined (void)", async () => {
    const { client } = makeClient();

    const result = await deleteFollow(client, { followId: "f1" });

    expect(result).toBeUndefined();
  });
});
