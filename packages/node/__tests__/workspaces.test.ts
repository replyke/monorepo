import {
  createWorkspace,
  fetchWorkspace,
  fetchManyWorkspaces,
  updateWorkspace,
  updateWorkspaceInheritFlag,
  deleteWorkspace,
  transferWorkspaceOwnership,
  fetchWorkspaceMembers,
  fetchWorkspaceMemberStanding,
  updateWorkspaceMember,
  removeWorkspaceMember,
  leaveWorkspace,
  removeWorkspaceMemberFromSubtree,
  createWorkspaceInvite,
  fetchWorkspaceInvites,
  revokeWorkspaceInvite,
  resendWorkspaceInvite,
  acceptWorkspaceInvite,
  declineWorkspaceInvite,
  fetchMyWorkspaceInvites,
  fetchWorkspaceAuthority,
} from "../src/modules/workspaces";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk workspaces (lifecycle + ownership) — request shaping", () => {
  it("createWorkspace posts the full body (incl. service-key actingUserId) to /workspaces", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, { actingUserId: "u1", name: "Acme" });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
      actingUserId: "u1",
      name: "Acme",
    });
  });

  it("createWorkspace forwards parentWorkspaceId + metadata for child creation", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, {
      actingUserId: "u1",
      name: "Team",
      metadata: { color: "blue" },
      parentWorkspaceId: "w-parent",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
      actingUserId: "u1",
      name: "Team",
      metadata: { color: "blue" },
      parentWorkspaceId: "w-parent",
    });
  });

  it("fetchWorkspace hits /workspaces/:id with no params when no include", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspace(client, { workspaceId: "w1" });
    // Everything but `workspaceId` is a query param, so an id-only call sends an
    // EMPTY params object — axios appends no query string for it.
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1", {
      params: {},
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
    await fetchManyWorkspaces(client, { actingUserId: "u1", page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces", {
      params: { actingUserId: "u1", page: 2, limit: 10 },
    });
  });

  it("updateWorkspace strips workspaceId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspace(client, {
      workspaceId: "w1",
      actingUserId: "u1",
      name: "Renamed",
      metadata: { k: 1 },
    });
    expect(projectInstance.patch).toHaveBeenCalledWith("/workspaces/w1", {
      actingUserId: "u1",
      name: "Renamed",
      metadata: { k: 1 },
    });
  });

  it("updateWorkspaceInheritFlag patches /workspaces/:id/inherit-flag with actingUserId + flag", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspaceInheritFlag(client, {
      workspaceId: "w1",
      actingUserId: "u1",
      inheritsFromParent: true,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/inherit-flag",
      { actingUserId: "u1", inheritsFromParent: true }
    );
  });

  it("deleteWorkspace sends the acting actingUserId in the request body (data)", async () => {
    const { client, projectInstance } = makeClient();
    await deleteWorkspace(client, { workspaceId: "w1", actingUserId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/workspaces/w1", {
      data: { actingUserId: "u1" },
    });
  });

  it("transferWorkspaceOwnership strips workspaceId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await transferWorkspaceOwnership(client, {
      workspaceId: "w1",
      actingUserId: "u1",
      newOwnerId: "u2",
      previousOwnerDisposition: "demote",
      previousOwnerRank: 5,
      previousOwnerCapabilities: ["invite"],
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/transfer-ownership",
      {
        actingUserId: "u1",
        newOwnerId: "u2",
        previousOwnerDisposition: "demote",
        previousOwnerRank: 5,
        previousOwnerCapabilities: ["invite"],
      }
    );
  });
});

describe("node-sdk workspaces (membership) — request shaping", () => {
  it("fetchWorkspaceMembers strips workspaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceMembers(client, {
      workspaceId: "w1",
      include: "descendants",
      countOnly: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1/members", {
      params: { include: "descendants", countOnly: true },
    });
  });

  it("fetchWorkspaceMemberStanding puts target in the path (no query params)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceMemberStanding(client, {
      workspaceId: "w1",
      targetUserId: "target1",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1",
      // No `actingUserId` given, so the params object is empty and no query
      // string is appended.
      { params: {} }
    );
  });

  it("updateWorkspaceMember puts target in the path, actor actingUserId in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      actingUserId: "actor1",
      capabilities: ["invite"],
      rank: 3,
      title: "Lead",
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1",
      { actingUserId: "actor1", capabilities: ["invite"], rank: 3, title: "Lead" }
    );
  });

  it("updateWorkspaceMember forwards relativeRank as the alternative rank coordinate", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      actingUserId: "actor1",
      relativeRank: 1,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1",
      { actingUserId: "actor1", relativeRank: 1 }
    );
    const [, body] = projectInstance.patch.mock.calls[0];
    // The two coordinates are mutually exclusive on the wire. The offset is
    // anchored on `actingUserId`'s rank, not the key's.
    expect(body).not.toHaveProperty("rank");
  });

  it("removeWorkspaceMember puts target in the path and sends actor actingUserId in the body (data)", async () => {
    const { client, projectInstance } = makeClient();
    await removeWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      actingUserId: "actor1",
    });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1",
      { data: { actingUserId: "actor1" } }
    );
  });

  it("leaveWorkspace deletes /members/me with the acting actingUserId in the body (data)", async () => {
    const { client, projectInstance } = makeClient();
    await leaveWorkspace(client, { workspaceId: "w1", actingUserId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/workspaces/w1/members/me",
      { data: { actingUserId: "u1" } }
    );
  });

  it("removeWorkspaceMemberFromSubtree puts target in the path and posts the acting actingUserId", async () => {
    const { client, projectInstance } = makeClient();
    await removeWorkspaceMemberFromSubtree(client, {
      workspaceId: "w1",
      targetUserId: "target1",
      actingUserId: "actor1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/members/target1/remove-from-subtree",
      { actingUserId: "actor1" }
    );
  });
});

describe("node-sdk workspaces (invitations) — request shaping", () => {
  it("createWorkspaceInvite strips workspaceId into the path and posts the rest (userId here is the TARGET)", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspaceInvite(client, {
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

  it("createWorkspaceInvite forwards an email-addressed invite body", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspaceInvite(client, {
      workspaceId: "w1",
      email: "New.Member@Example.com",
      rank: 1,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites",
      { email: "New.Member@Example.com", rank: 1 }
    );
  });

  it("createWorkspaceInvite forwards relativeRank, and sends neither rank field when both are omitted", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspaceInvite(client, {
      workspaceId: "w1",
      email: "a@b.co",
      actingUserId: "actor1",
      relativeRank: 1,
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces/w1/invites", {
      email: "a@b.co",
      actingUserId: "actor1",
      relativeRank: 1,
    });

    // Neither coordinate: the SDK sends nothing and the server applies its
    // one-below-the-inviter default. It must NOT invent a rank client-side.
    await createWorkspaceInvite(client, { workspaceId: "w1", email: "c@d.co" });
    const [, body] = projectInstance.post.mock.calls[1];
    expect(body).toEqual({ email: "c@d.co" });
    expect(body).not.toHaveProperty("rank");
    expect(body).not.toHaveProperty("relativeRank");
  });

  it("fetchWorkspaceInvites hits /workspaces/:id/invites", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceInvites(client, { workspaceId: "w1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces/w1/invites", {
      params: {},
    });
  });

  it("revokeWorkspaceInvite posts to the revoke route with an empty body", async () => {
    const { client, projectInstance } = makeClient();
    await revokeWorkspaceInvite(client, { workspaceId: "w1", inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites/i1/revoke",
      {}
    );
  });

  it("resendWorkspaceInvite posts to the resend route with an empty body", async () => {
    const { client, projectInstance } = makeClient();
    await resendWorkspaceInvite(client, { workspaceId: "w1", inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites/i1/resend",
      {}
    );
  });

  it("acceptWorkspaceInvite posts the accepting actingUserId to the non-:id-scoped accept route", async () => {
    const { client, projectInstance } = makeClient();
    await acceptWorkspaceInvite(client, { inviteId: "i1", actingUserId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/accept",
      { actingUserId: "u1" }
    );
  });

  it("declineWorkspaceInvite posts the declining actingUserId to the non-:id-scoped decline route", async () => {
    const { client, projectInstance } = makeClient();
    await declineWorkspaceInvite(client, { inviteId: "i1", actingUserId: "u1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/decline",
      { actingUserId: "u1" }
    );
  });

  it("fetchMyWorkspaceInvites hits /me/workspace-invites with the actingUserId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMyWorkspaceInvites(client, { actingUserId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/me/workspace-invites", {
      params: { actingUserId: "u1" },
    });
  });
});

describe("node-sdk workspaces (authority) — request shaping", () => {
  it("fetchWorkspaceAuthority hits the authority route with the acting user as a param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceAuthority(client, { workspaceId: "w1", actingUserId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/workspaces/w1/authority/me",
      { params: { actingUserId: "u1" } }
    );
  });
});

describe("node-sdk workspaces — response mapping", () => {
  it("createWorkspace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const workspace = { id: "w1", name: "Acme" };
    projectInstance.post.mockResolvedValueOnce({ data: workspace });
    await expect(
      createWorkspace(client, { actingUserId: "u1", name: "Acme" })
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
      fetchManyWorkspaces(client, { actingUserId: "u1" })
    ).resolves.toEqual(envelope);
  });

  it("fetchWorkspaceMembers returns response.data (roster or counts envelope)", async () => {
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
      fetchWorkspaceMembers(client, { workspaceId: "w1", countOnly: true })
    ).resolves.toEqual(counts);
  });

  it("acceptWorkspaceInvite returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true, workspaceId: "w1" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      acceptWorkspaceInvite(client, { inviteId: "i1", actingUserId: "u1" })
    ).resolves.toEqual(result);
  });

  it("fetchWorkspaceAuthority returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const authority = {
      reasons: ["owner"],
      capabilities: [],
      permissions: [],
      rank: null,
    };
    projectInstance.get.mockResolvedValueOnce({ data: authority });
    await expect(
      fetchWorkspaceAuthority(client, { workspaceId: "w1", actingUserId: "u1" })
    ).resolves.toEqual(authority);
  });
});
