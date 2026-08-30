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
import { makeClient } from "./helpers/client";

describe("js-sdk spaces (membership) — request shaping", () => {
  it("joinSpace posts /spaces/:spaceId/join with no body (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await joinSpace(client, { spaceId: "s1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces/s1/join");
    expect(projectInstance.post.mock.calls[0]).toHaveLength(1);
  });

  it("leaveSpace deletes /spaces/:spaceId/leave with no body/params (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await leaveSpace(client, { spaceId: "s1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/spaces/s1/leave");
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });

  it("checkMyMembership gets /spaces/:spaceId/membership/me with no params (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await checkMyMembership(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/spaces/s1/membership/me"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchSpaceMembers strips spaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceMembers(client, { spaceId: "s1", role: "admin", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/members", {
      params: { role: "admin", page: 1 },
    });
  });

  it("fetchSpaceMembers forwards spaceReputation params alongside role/status", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceMembers(client, {
      spaceId: "s1",
      status: "active",
      spaceReputationId: "s1",
      spaceReputationDescendants: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/members", {
      params: {
        status: "active",
        spaceReputationId: "s1",
        spaceReputationDescendants: true,
      },
    });
  });

  it("fetchSpaceTeam strips spaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceTeam(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/team", {
      params: {},
    });
  });

  it("fetchSpaceTeam forwards spaceReputation params as the rest of params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceTeam(client, {
      spaceId: "s1",
      spaceReputationId: "context",
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/team", {
      params: { spaceReputationId: "context" },
    });
  });

  it("updateMemberRole patches the role route with the membershipId target and role in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateMemberRole(client, {
      spaceId: "s1",
      memberId: "m1",
      role: "moderator",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/role",
      { role: "moderator" }
    );
  });

  it("approveMembership patches the approve route for the memberId target with no body", async () => {
    const { client, projectInstance } = makeClient();
    await approveMembership(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/approve"
    );
    expect(projectInstance.patch.mock.calls[0]).toHaveLength(1);
  });

  it("declineMembership patches the decline route for the memberId target with no body", async () => {
    const { client, projectInstance } = makeClient();
    await declineMembership(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/decline"
    );
    expect(projectInstance.patch.mock.calls[0]).toHaveLength(1);
  });

  it("banMember patches the ban route for the memberId target with no body", async () => {
    const { client, projectInstance } = makeClient();
    await banMember(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/ban"
    );
    expect(projectInstance.patch.mock.calls[0]).toHaveLength(1);
  });

  it("unbanMember patches the unban route for the memberId target with no body", async () => {
    const { client, projectInstance } = makeClient();
    await unbanMember(client, { spaceId: "s1", memberId: "m1" });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/members/m1/unban"
    );
    expect(projectInstance.patch.mock.calls[0]).toHaveLength(1);
  });
});

describe("js-sdk spaces (membership) — response mapping", () => {
  it("joinSpace returns the JoinSpaceResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Joined",
      membership: {
        id: "m1",
        spaceId: "s1",
        userId: "u1",
        role: "member" as const,
        status: "active" as const,
        joinedAt: "now",
      },
    };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    const response = await joinSpace(client, { spaceId: "s1" });

    expect(response).toEqual(result);
  });

  it("leaveSpace returns the LeaveSpaceResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Left space" };
    projectInstance.delete.mockResolvedValueOnce({ data: result });

    const response = await leaveSpace(client, { spaceId: "s1" });

    expect(response).toEqual(result);
  });

  it("checkMyMembership returns the CheckMyMembershipResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      isMember: true,
      role: "member" as const,
      status: "active" as const,
      joinedAt: "now",
      permissions: {
        canPost: true,
        canModerate: false,
        canRead: true,
        isAdmin: false,
        isModerator: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: result });

    const response = await checkMyMembership(client, { spaceId: "s1" });

    expect(response).toEqual(result);
  });

  it("fetchSpaceMembers returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        {
          membershipId: "m1",
          role: "member",
          status: "active",
          joinedAt: "now",
          user: { id: "u1", username: "alice", displayName: "Alice", avatar: "", metadata: {} },
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

    const result = await fetchSpaceMembers(client, { spaceId: "s1" });

    expect(result).toEqual(envelope);
  });

  it("fetchSpaceTeam returns the unpaginated SpaceTeamResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      data: [
        {
          membershipId: "m1",
          role: "admin",
          status: "active",
          joinedAt: "now",
          user: { id: "u1", username: "alice", displayName: "Alice", avatar: "", metadata: {} },
        },
      ],
    };
    projectInstance.get.mockResolvedValueOnce({ data: result });

    const response = await fetchSpaceTeam(client, { spaceId: "s1" });

    expect(response).toEqual(result);
  });

  it("updateMemberRole returns the UpdateMemberRoleResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Role updated",
      membership: {
        id: "m1",
        role: "moderator" as const,
        status: "active",
        joinedAt: "now",
        userId: "u1",
      },
    };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await updateMemberRole(client, {
      spaceId: "s1",
      memberId: "m1",
      role: "moderator",
    });

    expect(response).toEqual(result);
  });

  it("approveMembership returns the ApproveMemberResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Approved",
      membership: { id: "m1", status: "active" as const, joinedAt: "now" },
    };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await approveMembership(client, {
      spaceId: "s1",
      memberId: "m1",
    });

    expect(response).toEqual(result);
  });

  it("declineMembership returns the DeclineMemberResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Declined",
      membership: { id: "m1", status: "rejected" as const },
    };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await declineMembership(client, {
      spaceId: "s1",
      memberId: "m1",
    });

    expect(response).toEqual(result);
  });

  it("banMember returns the BanMemberResponse with the membership now banned", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Member banned",
      membership: { id: "m1", status: "banned" as const },
    };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await banMember(client, { spaceId: "s1", memberId: "m1" });

    expect(response).toEqual(result);
  });

  it("unbanMember returns the UnbanMemberResponse with the membership now active", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Member unbanned",
      membership: { id: "m1", status: "active" as const },
    };
    projectInstance.patch.mockResolvedValueOnce({ data: result });

    const response = await unbanMember(client, {
      spaceId: "s1",
      memberId: "m1",
    });

    expect(response).toEqual(result);
  });
});
