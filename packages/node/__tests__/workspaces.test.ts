import {
  createWorkspace,
  fetchWorkspace,
  fetchManyWorkspaces,
  updateWorkspace,
  updateInheritFlag,
  deleteWorkspace,
  transferOwnership,
  fetchMembers,
  fetchMemberStanding,
  updateMember,
  removeMember,
  leaveWorkspace,
  removeFromSubtree,
  createInvite,
  fetchInvites,
  revokeInvite,
  resendInvite,
  acceptInvite,
  declineInvite,
  fetchMyInvites,
  getAuthority,
} from "../src/modules/workspaces";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk workspaces (lifecycle + ownership) — request shaping", () => {
  it("createWorkspace posts the full body (incl. service-key userId) to /workspaces", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, { userId: "u1", name: "Acme" });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
      userId: "u1",
      name: "Acme",
    });
  });

  it("createWorkspace forwards parentWorkspaceId + metadata for child creation", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, {
      userId: "u1",
      name: "Team",
      metadata: { color: "blue" },
      parentWorkspaceId: "w-parent",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
      userId: "u1",
      name: "Team",
      metadata: { color: "blue" },
      parentWorkspaceId: "w-parent",
    });
  });

  it("fetchWorkspace hits /workspaces/:id with no params when no include", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspace(client, { workspaceId: "w1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1", {
      params: undefined,
    });
  });

  it("fetchWorkspace passes include=memberCount as a param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspace(client, { workspaceId: "w1", include: "memberCount" });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1", {
      params: { include: "memberCount" },
    });
  });

  it("fetchManyWorkspaces hits /workspaces with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyWorkspaces(client, { userId: "u1", page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces", {
      params: { userId: "u1", page: 2, limit: 10 },
    });
  });

  it("updateWorkspace strips workspaceId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspace(client, {
      workspaceId: "w1",
      userId: "u1",
      name: "Renamed",
      metadata: { k: 1 },
    });
    expect(projectInstance.patch).toHaveBeenCalledWith("/workspaces/w1", {
      userId: "u1",
      name: "Renamed",
      metadata: { k: 1 },
    });
  });

  it("updateInheritFlag patches /workspaces/:id/inherit-flag with userId + flag", async () => {
    const { client, projectInstance } = makeClient();
    await updateInheritFlag(client, {
      workspaceId: "w1",
      userId: "u1",
      inheritsFromParent: true,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/inherit-flag",
      { userId: "u1", inheritsFromParent: true }
    );
  });

  it("deleteWorkspace sends the acting userId in the request body (data)", async () => {
    const { client, projectInstance } = makeClient();
    await deleteWorkspace(client, { workspaceId: "w1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/workspaces/w1", {
      data: { userId: "u1" },
    });
  });

  it("transferOwnership strips workspaceId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await transferOwnership(client, {
      workspaceId: "w1",
      userId: "u1",
      newOwnerId: "u2",
      previousOwnerDisposition: "demote",
      previousOwnerRank: 5,
      previousOwnerCapabilities: ["invite"],
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/transfer-ownership",
      {
        userId: "u1",
        newOwnerId: "u2",
        previousOwnerDisposition: "demote",
        previousOwnerRank: 5,
        previousOwnerCapabilities: ["invite"],
      }
    );
  });
});

describe("node-sdk workspaces (membership) — request shaping", () => {
  it("fetchMembers strips workspaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMembers(client, {
      workspaceId: "w1",
      include: "descendants",
      countOnly: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1/members", {
      params: { include: "descendants", countOnly: true },
    });
  });

  it("fetchMemberStanding puts target in the path (no query params)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMemberStanding(client, {
      workspaceId: "w1",
      targetUserId: "target1",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1"
    );
  });

  it("updateMember puts target in the path, actor userId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateMember(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      userId: "actor1",
      capabilities: ["invite"],
      rank: 3,
      title: "Lead",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1",
      { userId: "actor1", capabilities: ["invite"], rank: 3, title: "Lead" }
    );
  });

  it("removeMember puts target in the path and sends actor userId in the body (data)", async () => {
    const { client, projectInstance } = makeClient();
    await removeMember(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      userId: "actor1",
    });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1",
      { data: { userId: "actor1" } }
    );
  });

  it("leaveWorkspace deletes /members/me with the acting userId in the body (data)", async () => {
    const { client, projectInstance } = makeClient();
    await leaveWorkspace(client, { workspaceId: "w1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/workspaces/w1/members/me",
      { data: { userId: "u1" } }
    );
  });

  it("removeFromSubtree puts target in the path and posts the acting userId", async () => {
    const { client, projectInstance } = makeClient();
    await removeFromSubtree(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      userId: "actor1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1/remove-from-subtree",
      { userId: "actor1" }
    );
  });
});

describe("node-sdk workspaces (invitations) — request shaping", () => {
  it("createInvite strips workspaceId into the path and posts the rest (userId here is the TARGET)", async () => {
    const { client, projectInstance } = makeClient();
    await createInvite(client, {
      workspaceId: "w1",
      userId: "invitee1",
      capabilities: ["invite"],
      rank: 2,
      title: "Manager",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites",
      { userId: "invitee1", capabilities: ["invite"], rank: 2, title: "Manager" }
    );
  });

  it("createInvite forwards an email-addressed invite body", async () => {
    const { client, projectInstance } = makeClient();
    await createInvite(client, {
      workspaceId: "w1",
      email: "New.Member@Example.com",
      rank: 1,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites",
      { email: "New.Member@Example.com", rank: 1 }
    );
  });

  it("fetchInvites hits /workspaces/:id/invites", async () => {
    const { client, projectInstance } = makeClient();
    await fetchInvites(client, { workspaceId: "w1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1/invites");
  });

  it("revokeInvite posts to the revoke route with an empty body", async () => {
    const { client, projectInstance } = makeClient();
    await revokeInvite(client, { workspaceId: "w1", inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites/i1/revoke",
      {}
    );
  });

  it("resendInvite posts to the resend route with an empty body", async () => {
    const { client, projectInstance } = makeClient();
    await resendInvite(client, { workspaceId: "w1", inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites/i1/resend",
      {}
    );
  });

  it("acceptInvite posts the accepting userId to the non-:id-scoped accept route", async () => {
    const { client, projectInstance } = makeClient();
    await acceptInvite(client, { inviteId: "i1", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/accept",
      { userId: "u1" }
    );
  });

  it("declineInvite posts the declining userId to the non-:id-scoped decline route", async () => {
    const { client, projectInstance } = makeClient();
    await declineInvite(client, { inviteId: "i1", userId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/decline",
      { userId: "u1" }
    );
  });

  it("fetchMyInvites hits /me/workspace-invites with the userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMyInvites(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/me/workspace-invites", {
      params: { userId: "u1" },
    });
  });
});

describe("node-sdk workspaces (authority) — request shaping", () => {
  it("getAuthority hits the authority route with the target userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await getAuthority(client, { workspaceId: "w1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/workspaces/w1/authority/me",
      { params: { userId: "u1" } }
    );
  });
});

describe("node-sdk workspaces — response mapping", () => {
  it("createWorkspace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const workspace = { id: "w1", name: "Acme" };
    projectInstance.post.mockResolvedValueOnce({ data: workspace });
    await expect(
      createWorkspace(client, { userId: "u1", name: "Acme" })
    ).resolves.toEqual(workspace);
  });

  it("fetchManyWorkspaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "w1" }],
      pagination: { page: 1, limit: 10, total: 1 },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchManyWorkspaces(client, { userId: "u1" })
    ).resolves.toEqual(envelope);
  });

  it("fetchMembers returns response.data (roster or counts envelope)", async () => {
    const { client, projectInstance } = makeClient();
    const counts = {
      counts: {
        owner: 1,
        member: 3,
        ancestorOwner: 0,
        reachHolder: 0,
        descendantMember: 0,
      },
      total: 4,
      distinctUsers: 4,
    };
    projectInstance.get.mockResolvedValueOnce({ data: counts });
    await expect(
      fetchMembers(client, { workspaceId: "w1", countOnly: true })
    ).resolves.toEqual(counts);
  });

  it("acceptInvite returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true, workspaceId: "w1" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      acceptInvite(client, { inviteId: "i1", userId: "u1" })
    ).resolves.toEqual(result);
  });

  it("getAuthority returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const authority = {
      reasons: ["owner"],
      capabilities: [],
      permissions: [],
      rank: null,
    };
    projectInstance.get.mockResolvedValueOnce({ data: authority });
    await expect(
      getAuthority(client, { workspaceId: "w1", userId: "u1" })
    ).resolves.toEqual(authority);
  });
});
