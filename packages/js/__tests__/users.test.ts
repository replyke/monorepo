import {
  checkUsernameAvailability,
  createBlock,
  createFollow,
  deleteBlock,
  deleteFollow,
  fetchBlockStatus,
  fetchBlockedUsers,
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
import { formDataToObject, makeClient } from "./helpers/client";

describe("js-sdk users — profile — request shaping", () => {
  it("fetchUserById strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserById(client, { userId: "u1", include: "stats" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1", {
      params: { include: "stats" },
    });
  });

  it("fetchUserById forwards spaceReputation params alongside include", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserById(client, {
      userId: "u1",
      spaceReputationId: "sp1",
      spaceReputationDescendants: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1", {
      params: { spaceReputationId: "sp1", spaceReputationDescendants: true },
    });
  });

  it("fetchUserByForeignId gets /users/by-foreign-id with the full data as params (no createIfNotFound — service-only)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserByForeignId(client, { foreignId: "f1", include: "stats" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/by-foreign-id", {
      params: { foreignId: "f1", include: "stats" },
    });
  });

  it("fetchUserByUsername gets /users/by-username with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserByUsername(client, { username: "alice" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/by-username", {
      params: { username: "alice" },
    });
  });

  it("fetchUserSuggestions gets /users/suggestions with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserSuggestions(client, { query: "ali" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/suggestions", {
      params: { query: "ali" },
    });
  });

  it("checkUsernameAvailability gets /users/check-username with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await checkUsernameAvailability(client, { username: "alice" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/users/check-username",
      { params: { username: "alice" } }
    );
  });

  it("updateUser strips userId into the path and patches the rest as JSON when there are no files", async () => {
    const { client, projectInstance } = makeClient();
    await updateUser(client, { userId: "u1", name: "Alice", bio: "hi" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/users/u1", {
      name: "Alice",
      bio: "hi",
    });
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).not.toBeInstanceOf(FormData);
  });

  it("updateUser keeps userId in the path (the target, may only update itself per server enforcement)", async () => {
    const { client, projectInstance } = makeClient();
    await updateUser(client, { userId: "u1", name: "Alice" });
    const [path] = projectInstance.patch.mock.calls[0];
    expect(path).toBe("/users/u1");
  });

  it("updateUser sends multipart/FormData with avatarFile + avatarFile.options when an avatar is attached", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["avatar-bytes"], "avatar.png", {
      type: "image/png",
    });
    await updateUser(client, {
      userId: "u1",
      name: "Alice",
      avatarFile: {
        file,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
    });

    const [path, body] = projectInstance.patch.mock.calls[0];
    expect(path).toBe("/users/u1");
    expect(body).toBeInstanceOf(FormData);

    const obj = formDataToObject(body as FormData);
    expect(obj.name).toBe("Alice");
    expect(obj.avatarFile).toBeInstanceOf(File);
    expect((obj.avatarFile as File).name).toBe("avatar.png");
    expect(obj["avatarFile.options"]).toBe(
      JSON.stringify({ mode: "original-aspect", sizes: { thumbnail: 200 } })
    );
    expect(obj).not.toHaveProperty("bannerFile");
  });

  it("updateUser sends multipart/FormData with bannerFile + bannerFile.options when a banner is attached", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["banner-bytes"], "banner.png", {
      type: "image/png",
    });
    await updateUser(client, {
      userId: "u1",
      bannerFile: {
        file,
        options: { mode: "original-aspect", sizes: { full: 1000 } },
      },
    });

    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);

    const obj = formDataToObject(body as FormData);
    expect(obj.bannerFile).toBeInstanceOf(File);
    expect((obj.bannerFile as File).name).toBe("banner.png");
    expect(obj["bannerFile.options"]).toBe(
      JSON.stringify({ mode: "original-aspect", sizes: { full: 1000 } })
    );
    expect(obj).not.toHaveProperty("avatarFile");
  });

  it("updateUser sends both avatarFile and bannerFile together, with object fields (metadata/location) JSON-stringified", async () => {
    const { client, projectInstance } = makeClient();
    const avatarFile = new File(["a"], "avatar.png", { type: "image/png" });
    const bannerFile = new File(["b"], "banner.png", { type: "image/png" });
    await updateUser(client, {
      userId: "u1",
      metadata: { plan: "pro" },
      location: { latitude: 40.0, longitude: -73.0 },
      avatarFile: {
        file: avatarFile,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
      bannerFile: {
        file: bannerFile,
        options: { mode: "original-aspect", sizes: { full: 1000 } },
      },
    });

    const [, body] = projectInstance.patch.mock.calls[0];
    const obj = formDataToObject(body as FormData);
    expect((obj.avatarFile as File).name).toBe("avatar.png");
    expect((obj.bannerFile as File).name).toBe("banner.png");
    expect(obj.metadata).toBe(JSON.stringify({ plan: "pro" }));
    expect(obj.location).toBe(
      JSON.stringify({ latitude: 40.0, longitude: -73.0 })
    );
  });

  it("updateUser falls back to a generic filename when the avatar Blob has no name", async () => {
    const { client, projectInstance } = makeClient();
    const blob = new Blob(["raw-bytes"], { type: "image/png" });
    await updateUser(client, {
      userId: "u1",
      avatarFile: {
        file: blob,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
    });

    const [, body] = projectInstance.patch.mock.calls[0];
    const formData = body as FormData;
    const entries = formData.getAll("avatarFile");
    expect(entries).toHaveLength(1);
    expect((entries[0] as File).name).toBe("avatar");
  });
});

describe("js-sdk users — graph queries (arbitrary target user) — request shaping", () => {
  it("fetchFollowersByUserId strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowersByUserId(client, { userId: "u1", page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/followers", {
      params: { page: 2, limit: 10 },
    });
  });

  it("fetchFollowersCountByUserId hits the followers-count route with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowersCountByUserId(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/users/u1/followers-count"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchFollowingByUserId strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowingByUserId(client, { userId: "u1", limit: 5 });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/following", {
      params: { limit: 5 },
    });
  });

  it("fetchFollowingCountByUserId hits the following-count route with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowingCountByUserId(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/users/u1/following-count"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchConnectionsByUserId strips userId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionsByUserId(client, { userId: "u1", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/u1/connections", {
      params: { page: 1 },
    });
  });

  it("fetchConnectionsCountByUserId hits the connections-count route with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionsCountByUserId(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/users/u1/connections-count"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });
});

describe("js-sdk users — graph actions (arbitrary target user) — request shaping (no actingUserId — actor derived from token)", () => {
  it("createFollow posts an empty body to /users/:userId/follow, no actingUserId", async () => {
    const { client, projectInstance } = makeClient();
    await createFollow(client, { userId: "target1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/users/target1/follow",
      {}
    );
  });

  it("deleteFollow deletes /users/:userId/follow with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await deleteFollow(client, { userId: "target1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/users/target1/follow"
    );
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("fetchFollowStatus gets /users/:userId/follow with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchFollowStatus(client, { userId: "target1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/users/target1/follow"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("requestConnection posts only the rest of the body (e.g. message) to /users/:userId/connection, no actingUserId", async () => {
    const { client, projectInstance } = makeClient();
    await requestConnection(client, { userId: "target1", message: "hi" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/users/target1/connection",
      { message: "hi" }
    );
  });

  it("requestConnection posts an empty body when no message is given", async () => {
    const { client, projectInstance } = makeClient();
    await requestConnection(client, { userId: "target1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/users/target1/connection",
      {}
    );
  });

  it("fetchConnectionStatus gets /users/:userId/connection with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchConnectionStatus(client, { userId: "target1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/users/target1/connection"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("removeConnectionByUserId deletes /users/:userId/connection with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await removeConnectionByUserId(client, { userId: "target1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/users/target1/connection"
    );
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("createBlock posts an empty body to /users/:userId/block, no actingUserId", async () => {
    const { client, projectInstance } = makeClient();
    await createBlock(client, { userId: "target1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/users/target1/block",
      {}
    );
  });

  it("deleteBlock deletes /users/:userId/block with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await deleteBlock(client, { userId: "target1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/users/target1/block"
    );
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("fetchBlockStatus gets /users/:userId/block with no params (outbound-only)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchBlockStatus(client, { userId: "target1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/users/target1/block");
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchBlockedUsers gets /blocks (own list — no userId in path/params) with pagination", async () => {
    const { client, projectInstance } = makeClient();
    await fetchBlockedUsers(client, { page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith("/blocks", {
      params: { page: 2, limit: 10 },
    });
  });

  it("fetchBlockedUsers defaults to an empty params object when called with no args", async () => {
    const { client, projectInstance } = makeClient();
    await fetchBlockedUsers(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/blocks", { params: {} });
  });
});

describe("js-sdk users — response mapping", () => {
  it("fetchUserById returns the User", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", username: "alice" };
    projectInstance.get.mockResolvedValueOnce({ data: user });

    const result = await fetchUserById(client, { userId: "u1" });

    expect(result).toEqual(user);
  });

  it("fetchUserByForeignId returns the User", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", foreignId: "f1" };
    projectInstance.get.mockResolvedValueOnce({ data: user });

    const result = await fetchUserByForeignId(client, { foreignId: "f1" });

    expect(result).toEqual(user);
  });

  it("fetchUserByUsername returns the User", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", username: "alice" };
    projectInstance.get.mockResolvedValueOnce({ data: user });

    const result = await fetchUserByUsername(client, { username: "alice" });

    expect(result).toEqual(user);
  });

  it("fetchUserSuggestions returns the array of Users", async () => {
    const { client, projectInstance } = makeClient();
    const users = [{ id: "u1" }, { id: "u2" }];
    projectInstance.get.mockResolvedValueOnce({ data: users });

    const result = await fetchUserSuggestions(client, { query: "a" });

    expect(result).toEqual(users);
  });

  it("checkUsernameAvailability returns the availability wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { available: false } });

    const result = await checkUsernameAvailability(client, {
      username: "alice",
    });

    expect(result).toEqual({ available: false });
  });

  it("updateUser returns the updated AuthUser (JSON path)", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", name: "Alice" };
    projectInstance.patch.mockResolvedValueOnce({ data: user });

    const result = await updateUser(client, { userId: "u1", name: "Alice" });

    expect(result).toEqual(user);
  });

  it("updateUser returns the updated AuthUser (multipart path)", async () => {
    const { client, projectInstance } = makeClient();
    const user = { id: "u1", avatar: "https://cdn.example.com/avatar.png" };
    projectInstance.patch.mockResolvedValueOnce({ data: user });
    const file = new File(["x"], "avatar.png", { type: "image/png" });

    const result = await updateUser(client, {
      userId: "u1",
      avatarFile: { file, options: { mode: "original-aspect", sizes: {} } },
    });

    expect(result).toEqual(user);
  });

  it("fetchFollowersByUserId returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "f1", user: { id: "u2" } }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchFollowersByUserId(client, { userId: "u1" });

    expect(result).toEqual(envelope);
  });

  it("fetchFollowersCountByUserId returns the count wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { count: 7 } });

    const result = await fetchFollowersCountByUserId(client, { userId: "u1" });

    expect(result).toEqual({ count: 7 });
  });

  it("fetchFollowingByUserId returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "f1", user: { id: "u2" } }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchFollowingByUserId(client, { userId: "u1" });

    expect(result).toEqual(envelope);
  });

  it("fetchFollowingCountByUserId returns the count wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { count: 4 } });

    const result = await fetchFollowingCountByUserId(client, { userId: "u1" });

    expect(result).toEqual({ count: 4 });
  });

  it("fetchConnectionsByUserId returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "c1", connectedUser: { id: "u2" }, connectedAt: "now" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchConnectionsByUserId(client, { userId: "u1" });

    expect(result).toEqual(envelope);
  });

  it("fetchConnectionsCountByUserId returns the count wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { count: 2 } });

    const result = await fetchConnectionsCountByUserId(client, {
      userId: "u1",
    });

    expect(result).toEqual({ count: 2 });
  });

  it("createFollow returns the created Follow", async () => {
    const { client, projectInstance } = makeClient();
    const follow = { id: "fol1", createdAt: "now" };
    projectInstance.post.mockResolvedValueOnce({ data: follow });

    const result = await createFollow(client, { userId: "target1" });

    expect(result).toEqual(follow);
  });

  it("deleteFollow resolves to undefined (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });

    const result = await deleteFollow(client, { userId: "target1" });

    expect(result).toBeUndefined();
  });

  it("fetchFollowStatus returns the follow-status wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const status = { isFollowing: true, followId: "fol1", followedAt: "now" };
    projectInstance.get.mockResolvedValueOnce({ data: status });

    const result = await fetchFollowStatus(client, { userId: "target1" });

    expect(result).toEqual(status);
  });

  it("requestConnection returns the created connection-request response", async () => {
    const { client, projectInstance } = makeClient();
    const conn = { id: "conn1", status: "pending", createdAt: "now" };
    projectInstance.post.mockResolvedValueOnce({ data: conn });

    const result = await requestConnection(client, { userId: "target1" });

    expect(result).toEqual(conn);
  });

  it("fetchConnectionStatus returns the connection-status union", async () => {
    const { client, projectInstance } = makeClient();
    const status = { status: "connected", connectionId: "conn1", connectedAt: "now", requestedAt: "earlier" };
    projectInstance.get.mockResolvedValueOnce({ data: status });

    const result = await fetchConnectionStatus(client, { userId: "target1" });

    expect(result).toEqual(status);
  });

  it("removeConnectionByUserId returns the removal-action response", async () => {
    const { client, projectInstance } = makeClient();
    const removal = { id: "conn1", status: "declined", action: "decline" as const };
    projectInstance.delete.mockResolvedValueOnce({ data: removal });

    const result = await removeConnectionByUserId(client, {
      userId: "target1",
    });

    expect(result).toEqual(removal);
  });

  it("createBlock returns the created block", async () => {
    const { client, projectInstance } = makeClient();
    const block = {
      id: "blk1",
      blockerId: "me",
      blockedId: "target1",
      createdAt: "now",
    };
    projectInstance.post.mockResolvedValueOnce({ data: block });

    const result = await createBlock(client, { userId: "target1" });

    expect(result).toEqual(block);
  });

  it("deleteBlock resolves to undefined (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });

    const result = await deleteBlock(client, { userId: "target1" });

    expect(result).toBeUndefined();
  });

  it("fetchBlockStatus returns the outbound-only block-status wrapper", async () => {
    const { client, projectInstance } = makeClient();
    const status = { blocked: true, blockId: "blk1", createdAt: "now" };
    projectInstance.get.mockResolvedValueOnce({ data: status });

    const result = await fetchBlockStatus(client, { userId: "target1" });

    expect(result).toEqual(status);
  });

  it("fetchBlockedUsers returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "blk1", blockedUser: { id: "u2" }, createdAt: "now" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchBlockedUsers(client, { page: 1 });

    expect(result).toEqual(envelope);
  });
});
