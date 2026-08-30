import {
  checkUsernameAvailability,
  createBlock,
  createFollow,
  deleteBlock,
  deleteFollow,
  fetchBlockStatus,
  fetchBlockedUsers,
  deleteUser,
  fetchConnectionStatus,
  fetchConnectionsByUserId,
  fetchConnectionsCountByUserId,
  fetchFollowStatus,
  fetchFollowersByUserId,
  fetchFollowersCountByUserId,
  fetchFollowingByUserId,
  fetchFollowingCountByUserId,
  fetchUserByForeignId,
  fetchUserById,
  fetchUserByUsername,
  fetchUserSuggestions,
  removeConnectionByUserId,
  requestConnection,
  updateUser,
} from "../src/modules/users";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk users — profile — request shaping", () => {
  it("fetchUserById strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserById(client, { userId: "u1", include: "stats" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1", {
      params: { include: "stats" },
    });
  });

  it("fetchUserByForeignId JSON-stringifies metadata/secureMetadata", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserByForeignId(client, {
      foreignId: "f1",
      metadata: { plan: "pro" },
      secureMetadata: { internalScore: 5 },
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/by-foreign-id", {
      params: {
        foreignId: "f1",
        createIfNotFound: undefined,
        name: undefined,
        username: undefined,
        avatar: undefined,
        bio: undefined,
        metadata: JSON.stringify({ plan: "pro" }),
        secureMetadata: JSON.stringify({ internalScore: 5 }),
        include: undefined,
        spaceReputationId: undefined,
        spaceReputationDescendants: undefined,
      },
    });
  });

  it("fetchUserByUsername hits /users/by-username with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserByUsername(client, { username: "alice" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/by-username", {
      params: { username: "alice" },
    });
  });

  it("fetchUserSuggestions hits /users/suggestions with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserSuggestions(client, { query: "ali" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/suggestions", {
      params: { query: "ali" },
    });
  });

  it("checkUsernameAvailability hits /users/check-username with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await checkUsernameAvailability(client, { username: "alice" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/check-username", {
      params: { username: "alice" },
    });
  });

  it("updateUser strips userId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateUser(client, { userId: "u1", name: "Alice" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/users/u1", {
      name: "Alice",
    });
  });

  it("deleteUser deletes /users/:id", async () => {
    const { client, projectInstance } = makeClient();
    await deleteUser(client, { userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/users/u1");
  });
});

describe("node-sdk users — graph queries — request shaping", () => {
  it("fetchFollowersByUserId strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowersByUserId(client, { userId: "u1", page: 2 });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/followers", {
      params: { page: 2 },
    });
  });

  it("fetchFollowersCountByUserId hits the followers-count route", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowersCountByUserId(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/followers-count");
  });

  it("fetchFollowingByUserId strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowingByUserId(client, { userId: "u1", limit: 5 });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/following", {
      params: { limit: 5 },
    });
  });

  it("fetchFollowingCountByUserId hits the following-count route", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowingCountByUserId(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/following-count");
  });

  it("fetchConnectionsByUserId strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionsByUserId(client, { userId: "u1", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/connections", {
      params: { page: 1 },
    });
  });

  it("fetchConnectionsCountByUserId hits the connections-count route", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionsCountByUserId(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/connections-count");
  });
});

describe("node-sdk users — graph actions — request shaping (actingUserId vs path userId)", () => {
  it("createFollow posts actingUserId in the body, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await createFollow(client, { userId: "target1", actingUserId: "follower1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/users/target1/follow", {
      actingUserId: "follower1",
    });
  });

  it("deleteFollow sends actingUserId as a param, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await deleteFollow(client, { userId: "target1", actingUserId: "follower1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/users/target1/follow", {
      params: { actingUserId: "follower1" },
    });
  });

  it("fetchFollowStatus sends actingUserId as a param, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowStatus(client, { userId: "target1", actingUserId: "follower1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/target1/follow", {
      params: { actingUserId: "follower1" },
    });
  });

  it("requestConnection posts actingUserId (+ rest of body) to the target's path", async () => {
    const { client, projectInstance } = makeClient();
    await requestConnection(client, {
      userId: "target1",
      actingUserId: "requester1",
      message: "hi",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/users/target1/connection", {
      actingUserId: "requester1",
      message: "hi",
    });
  });

  it("fetchConnectionStatus sends actingUserId as a param, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionStatus(client, {
      userId: "target1",
      actingUserId: "requester1",
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/target1/connection", {
      params: { actingUserId: "requester1" },
    });
  });

  it("removeConnectionByUserId sends actingUserId as a param, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await removeConnectionByUserId(client, {
      userId: "target1",
      actingUserId: "requester1",
    });
    expect(projectInstance.delete).toHaveBeenCalledWith("/users/target1/connection", {
      params: { actingUserId: "requester1" },
    });
  });

  it("createBlock posts actingUserId in the body, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await createBlock(client, { userId: "target1", actingUserId: "blocker1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/users/target1/block", {
      actingUserId: "blocker1",
    });
  });

  it("deleteBlock sends actingUserId as a param, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await deleteBlock(client, { userId: "target1", actingUserId: "blocker1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/users/target1/block", {
      params: { actingUserId: "blocker1" },
    });
  });

  it("fetchBlockStatus sends actingUserId as a param, userId (target) in the path", async () => {
    const { client, projectInstance } = makeClient();
    await fetchBlockStatus(client, { userId: "target1", actingUserId: "blocker1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/target1/block", {
      params: { actingUserId: "blocker1" },
    });
  });

  it("fetchBlockedUsers hits /blocks with the actor as the userId query param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchBlockedUsers(client, { actingUserId: "blocker1", page: 2 });
    expect(projectInstance.get).toHaveBeenCalledWith("/blocks", {
      params: { userId: "blocker1", page: 2 },
    });
  });
});

describe("node-sdk users — response mapping", () => {
  it("fetchUserById returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", username: "alice" };
    projectInstance.get.mockResolvedValueOnce({ data: user });
    await expect(fetchUserById(client, { userId: "u1" })).resolves.toEqual(user);
  });

  it("fetchUserByForeignId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1" };
    projectInstance.get.mockResolvedValueOnce({ data: user });
    await expect(
      fetchUserByForeignId(client, { foreignId: "f1" }),
    ).resolves.toEqual(user);
  });

  it("fetchUserByUsername returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1" };
    projectInstance.get.mockResolvedValueOnce({ data: user });
    await expect(
      fetchUserByUsername(client, { username: "alice" }),
    ).resolves.toEqual(user);
  });

  it("fetchUserSuggestions returns response.data as an array", async () => {
    const { client, projectInstance } = makeClient();
    const users = [{ id: "u1" }, { id: "u2" }];
    projectInstance.get.mockResolvedValueOnce({ data: users });
    await expect(
      fetchUserSuggestions(client, { query: "a" }),
    ).resolves.toEqual(users);
  });

  it("checkUsernameAvailability returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { available: false };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      checkUsernameAvailability(client, { username: "alice" }),
    ).resolves.toEqual(result);
  });

  it("updateUser returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", name: "Alice" };
    projectInstance.patch.mockResolvedValueOnce({ data: user });
    await expect(
      updateUser(client, { userId: "u1", name: "Alice" }),
    ).resolves.toEqual(user);
  });

  it("deleteUser resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(deleteUser(client, { userId: "u1" })).resolves.toBeUndefined();
  });

  it("fetchFollowersByUserId returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "u2" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchFollowersByUserId(client, { userId: "u1" }),
    ).resolves.toEqual(envelope);
  });

  it("fetchFollowersCountByUserId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { count: 7 };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      fetchFollowersCountByUserId(client, { userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("fetchConnectionsByUserId returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "c1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchConnectionsByUserId(client, { userId: "u1" }),
    ).resolves.toEqual(envelope);
  });

  it("fetchConnectionsCountByUserId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { count: 3 };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      fetchConnectionsCountByUserId(client, { userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("createFollow returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const follow = { id: "fol1" };
    projectInstance.post.mockResolvedValueOnce({ data: follow });
    await expect(
      createFollow(client, { userId: "target1", actingUserId: "follower1" }),
    ).resolves.toEqual(follow);
  });

  it("fetchFollowStatus returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { isFollowing: true, followId: "fol1" };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      fetchFollowStatus(client, { userId: "target1", actingUserId: "follower1" }),
    ).resolves.toEqual(result);
  });

  it("requestConnection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const connection = { id: "conn1", status: "pending" };
    projectInstance.post.mockResolvedValueOnce({ data: connection });
    await expect(
      requestConnection(client, { userId: "target1", actingUserId: "requester1" }),
    ).resolves.toEqual(connection);
  });

  it("fetchConnectionStatus returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { status: "connected" };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      fetchConnectionStatus(client, { userId: "target1", actingUserId: "requester1" }),
    ).resolves.toEqual(result);
  });

  it("removeConnectionByUserId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { removed: true };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(
      removeConnectionByUserId(client, {
        userId: "target1",
        actingUserId: "requester1",
      }),
    ).resolves.toEqual(result);
  });

  it("createBlock returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const block = { id: "blk1", blockerId: "blocker1", blockedId: "target1" };
    projectInstance.post.mockResolvedValueOnce({ data: block });
    await expect(
      createBlock(client, { userId: "target1", actingUserId: "blocker1" }),
    ).resolves.toEqual(block);
  });

  it("deleteBlock resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      deleteBlock(client, { userId: "target1", actingUserId: "blocker1" }),
    ).resolves.toBeUndefined();
  });

  it("fetchBlockStatus returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { blocked: true, blockId: "blk1" };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      fetchBlockStatus(client, { userId: "target1", actingUserId: "blocker1" }),
    ).resolves.toEqual(result);
  });

  it("fetchBlockedUsers returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "blk1", blockedUser: { id: "target1" }, createdAt: "now" }],
      pagination: { page: 1, limit: 10, total: 1 },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchBlockedUsers(client, { actingUserId: "blocker1" }),
    ).resolves.toEqual(envelope);
  });
});
