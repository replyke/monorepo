import {
  deleteFollow,
  fetchFollowers,
  fetchFollowersCount,
  fetchFollowing,
  fetchFollowingCount,
} from "../src/modules/follows";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk follows — request shaping", () => {
  it("fetchFollowing hits /follows/following with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowing(client, { userId: "u1", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/follows/following", {
      params: { userId: "u1", page: 1 },
    });
  });

  it("fetchFollowers hits /follows/followers with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowers(client, { userId: "u1", limit: 5 });
    expect(projectInstance.get).toHaveBeenCalledWith("/follows/followers", {
      params: { userId: "u1", limit: 5 },
    });
  });

  it("fetchFollowingCount hits /follows/following-count with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowingCount(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/follows/following-count", {
      params: { userId: "u1" },
    });
  });

  it("fetchFollowersCount hits /follows/followers-count with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowersCount(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/follows/followers-count", {
      params: { userId: "u1" },
    });
  });

  it("deleteFollow (by record id) deletes /follows/:followId with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await deleteFollow(client, { followId: "fol1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/follows/fol1", {
      params: { userId: "u1" },
    });
  });
});

describe("node-sdk follows — response mapping", () => {
  it("fetchFollowing returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "f1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchFollowing(client, { userId: "u1" })).resolves.toEqual(envelope);
  });

  it("fetchFollowers returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "f2" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchFollowers(client, { userId: "u1" })).resolves.toEqual(envelope);
  });

  it("fetchFollowingCount returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { count: 4 };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchFollowingCount(client, { userId: "u1" })).resolves.toEqual(result);
  });

  it("fetchFollowersCount returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { count: 9 };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchFollowersCount(client, { userId: "u1" })).resolves.toEqual(result);
  });

  it("deleteFollow resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      deleteFollow(client, { followId: "fol1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });
});
