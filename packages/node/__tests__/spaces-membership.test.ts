import {
  approveMembership,
  banMember,
  checkMyMembership,
  declineMembership,
  fetchSpaceMembers,
  fetchSpaceTeam,
  joinSpace,
  leaveSpace,
  unbanMember,
  updateMemberRole,
} from "../src/modules/spaces";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk spaces (membership) — request shaping", () => {
  it("joinSpace posts userId to /spaces/:id/join", async () => {
    const { client, projectInstance } = makeClient();
    await joinSpace(client, { spaceId: "s1", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces/s1/join", {
      userId: "u1",
    });
  });

  it("leaveSpace sends userId as a param to /spaces/:id/leave", async () => {
    const { client, projectInstance } = makeClient();
    await leaveSpace(client, { spaceId: "s1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/spaces/s1/leave", {
      params: { userId: "u1" },
    });
  });

  it("checkMyMembership sends userId as a param to /spaces/:id/membership/me", async () => {
    const { client, projectInstance } = makeClient();
    await checkMyMembership(client, { spaceId: "s1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/spaces/s1/membership/me",
      { params: { userId: "u1" } },
    );
  });

  it("fetchSpaceMembers strips spaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceMembers(client, { spaceId: "s1", role: "admin", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/members", {
      params: { role: "admin", page: 1 },
    });
  });

  it("fetchSpaceTeam strips spaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceTeam(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/team", {
      params: {},
    });
  });

  it("updateMemberRole patches the role route with role in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateMemberRole(client, { spaceId: "s1", memberId: "m1", role: "moderator" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/role",
      { role: "moderator" },
    );
  });

  it("approveMembership patches the approve route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await approveMembership(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/approve",
    );
  });

  it("declineMembership patches the decline route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await declineMembership(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/decline",
    );
  });

  it("banMember patches the ban route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await banMember(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/spaces/s1/members/m1/ban");
  });

  it("unbanMember patches the unban route with no body", async () => {
    const { client, projectInstance } = makeClient();
    await unbanMember(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/unban",
    );
  });
});

describe("node-sdk spaces (membership) — response mapping", () => {
  it("joinSpace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { membership: { id: "m1", status: "active" } };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      joinSpace(client, { spaceId: "s1", userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("leaveSpace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { left: true };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(
      leaveSpace(client, { spaceId: "s1", userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("checkMyMembership returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { isMember: true, role: "member" };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      checkMyMembership(client, { spaceId: "s1", userId: "u1" }),
    ).resolves.toEqual(result);
  });

  it("fetchSpaceMembers returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { data: [{ id: "m1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchSpaceMembers(client, { spaceId: "s1" })).resolves.toEqual(result);
  });

  it("fetchSpaceTeam returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { admins: [], moderators: [] };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchSpaceTeam(client, { spaceId: "s1" })).resolves.toEqual(result);
  });

  it("updateMemberRole returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { membership: { id: "m1", role: "moderator" } };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      updateMemberRole(client, { spaceId: "s1", memberId: "m1", role: "moderator" }),
    ).resolves.toEqual(result);
  });

  it("approveMembership returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "approved", membership: { id: "m1", status: "active" } };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      approveMembership(client, { spaceId: "s1", memberId: "m1" }),
    ).resolves.toEqual(result);
  });

  it("declineMembership returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "declined", membership: { id: "m1", status: "rejected" } };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      declineMembership(client, { spaceId: "s1", memberId: "m1" }),
    ).resolves.toEqual(result);
  });

  it("banMember returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "banned", membership: { id: "m1", status: "banned" as const } };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      banMember(client, { spaceId: "s1", memberId: "m1" }),
    ).resolves.toEqual(result);
  });

  it("unbanMember returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "unbanned", membership: { id: "m1", status: "active" as const } };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      unbanMember(client, { spaceId: "s1", memberId: "m1" }),
    ).resolves.toEqual(result);
  });
});
