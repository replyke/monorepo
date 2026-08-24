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
import * as Workspaces from "../src/modules/workspaces";
import { makeClient } from "./helpers/client";

/**
 * Recursively asserts that no acting-user `userId` leaks into a client call.
 * The bearer token is the actor for @sublay/js, so the server derives the
 * actor — sending an `actingUserId` that names anyone but the token's own user
 * would be Rule A's classic porting mistake (403 from the server). node-sdk
 * deliberately DOES send one (service keys act on behalf of a named user); the
 * @sublay/js props types simply never carry it.
 *
 * NOTE: two shapes legitimately carry a user id and are asserted separately:
 *   - `createWorkspaceInvite`'s body `userId` addresses the invite TARGET.
 *   - the `:userId` PATH segment on the member routes addresses the TARGET
 *     member. Neither is the actor, and neither is ever a body/query field.
 */
function expectNoActorUserId(payload: unknown): void {
  if (payload == null || typeof payload !== "object") return;
  for (const [key, value] of Object.entries(
    payload as Record<string, unknown>
  )) {
    expect(key).not.toBe("userId");
    expect(key).not.toBe("actingUserId");
    if (value && typeof value === "object") expectNoActorUserId(value);
  }
}

/** Asserts every recorded call on every verb carries no actor `userId`. */
function expectNoActorUserIdAnywhere(
  projectInstance: ReturnType<typeof makeClient>["projectInstance"]
): void {
  for (const verb of ["get", "post", "patch", "delete"] as const) {
    for (const call of projectInstance[verb].mock.calls) {
      // args[0] is the URL (the path may legitimately contain a target user
      // id); everything after it is body/config and must be clean.
      for (const arg of call.slice(1)) expectNoActorUserId(arg);
    }
  }
}

describe("js-sdk workspaces — surface", () => {
  it("exports all 21 canonical workspace functions and nothing else", () => {
    expect(Object.keys(Workspaces).sort()).toEqual(
      [
        "acceptWorkspaceInvite",
        "createWorkspace",
        "createWorkspaceInvite",
        "declineWorkspaceInvite",
        "deleteWorkspace",
        "fetchManyWorkspaces",
        "fetchMyWorkspaceInvites",
        "fetchWorkspace",
        "fetchWorkspaceAuthority",
        "fetchWorkspaceInvites",
        "fetchWorkspaceMemberStanding",
        "fetchWorkspaceMembers",
        "leaveWorkspace",
        "removeWorkspaceMember",
        "removeWorkspaceMemberFromSubtree",
        "resendWorkspaceInvite",
        "revokeWorkspaceInvite",
        "transferWorkspaceOwnership",
        "updateWorkspace",
        "updateWorkspaceInheritFlag",
        "updateWorkspaceMember",
      ].sort()
    );
  });
});

describe("js-sdk workspaces — lifecycle request shaping", () => {
  it("createWorkspace posts the body to /workspaces (no actor userId)", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, { name: "Acme" });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
      name: "Acme",
    });
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("createWorkspace forwards parentWorkspaceId + metadata for a child", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, {
      name: "Team",
      metadata: { color: "blue" },
      parentWorkspaceId: "w-parent",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
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

  it("fetchManyWorkspaces hits /workspaces with only pagination/include params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyWorkspaces(client, { page: 2, limit: 10, include: "x" });
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces", {
      params: { page: 2, limit: 10, include: "x" },
    });
  });

  it("fetchManyWorkspaces works with no args (defaults to {})", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyWorkspaces(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/workspaces", {
      params: {},
    });
  });

  it("updateWorkspace PATCHes /workspaces/:id with the body minus workspaceId", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspace(client, {
      workspaceId: "w1",
      name: "Renamed",
      metadata: { tier: "pro" },
    });
    expect(projectInstance.patch).toHaveBeenCalledWith("/workspaces/w1", {
      name: "Renamed",
      metadata: { tier: "pro" },
    });
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("updateWorkspaceInheritFlag PATCHes /workspaces/:id/inherit-flag", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspaceInheritFlag(client, {
      workspaceId: "w1",
      inheritsFromParent: true,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/inherit-flag",
      { inheritsFromParent: true }
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("deleteWorkspace DELETEs /workspaces/:id with NO body at all", async () => {
    const { client, projectInstance } = makeClient();
    await deleteWorkspace(client, { workspaceId: "w1" });
    // node-sdk sends `{ data: { userId } }` here; the client SDK must not.
    expect(projectInstance.delete.mock.calls[0]).toEqual(["/workspaces/w1"]);
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("transferWorkspaceOwnership POSTs to /transfer-ownership with the body minus workspaceId", async () => {
    const { client, projectInstance } = makeClient();
    await transferWorkspaceOwnership(client, {
      workspaceId: "w1",
      newOwnerId: "u-new",
      previousOwnerDisposition: "demote",
      previousOwnerRank: 3,
      previousOwnerCapabilities: ["invite"],
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/transfer-ownership",
      {
        newOwnerId: "u-new",
        previousOwnerDisposition: "demote",
        previousOwnerRank: 3,
        previousOwnerCapabilities: ["invite"],
      }
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });
});

describe("js-sdk workspaces — membership request shaping", () => {
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
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("fetchWorkspaceMemberStanding GETs /workspaces/:id/members/:targetUserId with no config", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceMemberStanding(client, {
      workspaceId: "w1",
      targetUserId: "u-target",
    });
    expect(projectInstance.get.mock.calls[0]).toEqual([
      "/workspaces/w1/members/u-target",
    ]);
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("updateWorkspaceMember PATCHes the member route with the body minus path params", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "u-target",
      capabilities: ["invite", "view"],
      permissions: ["billing:read"],
      rank: 4,
      title: "Lead",
      metadata: { team: "core" },
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/workspaces/w1/members/u-target",
      {
        capabilities: ["invite", "view"],
        permissions: ["billing:read"],
        rank: 4,
        title: "Lead",
        metadata: { team: "core" },
      }
    );
    // node-sdk sends the ACTOR as body.userId on this route — never here.
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("removeWorkspaceMember DELETEs the member route with NO body", async () => {
    const { client, projectInstance } = makeClient();
    await removeWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "u-target",
    });
    expect(projectInstance.delete.mock.calls[0]).toEqual([
      "/workspaces/w1/members/u-target",
    ]);
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("leaveWorkspace DELETEs /workspaces/:id/members/me with NO body", async () => {
    const { client, projectInstance } = makeClient();
    await leaveWorkspace(client, { workspaceId: "w1" });
    expect(projectInstance.delete.mock.calls[0]).toEqual([
      "/workspaces/w1/members/me",
    ]);
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("removeWorkspaceMemberFromSubtree POSTs to the subtree route with an EMPTY body", async () => {
    const { client, projectInstance } = makeClient();
    await removeWorkspaceMemberFromSubtree(client, {
      workspaceId: "w1",
      targetUserId: "u-target",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/members/u-target/remove-from-subtree",
      {}
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });
});

describe("js-sdk workspaces — invitation request shaping", () => {
  it("createWorkspaceInvite strips workspaceId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspaceInvite(client, {
      workspaceId: "w1",
      email: "New.Member@Example.com",
      capabilities: ["invite"],
      rank: 2,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites",
      {
        email: "New.Member@Example.com",
        capabilities: ["invite"],
        rank: 2,
      }
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("fetchWorkspaceInvites GETs /workspaces/:id/invites with no params (unpaginated)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceInvites(client, { workspaceId: "w1" });
    expect(projectInstance.get.mock.calls[0]).toEqual([
      "/workspaces/w1/invites",
    ]);
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("revokeWorkspaceInvite POSTs to .../invites/:inviteId/revoke (not DELETE)", async () => {
    const { client, projectInstance } = makeClient();
    await revokeWorkspaceInvite(client, {
      workspaceId: "w1",
      inviteId: "i1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites/i1/revoke",
      {}
    );
    expect(projectInstance.delete).not.toHaveBeenCalled();
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("resendWorkspaceInvite POSTs to .../invites/:inviteId/resend (not DELETE)", async () => {
    const { client, projectInstance } = makeClient();
    await resendWorkspaceInvite(client, {
      workspaceId: "w1",
      inviteId: "i1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspaces/w1/invites/i1/resend",
      {}
    );
    expect(projectInstance.delete).not.toHaveBeenCalled();
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("acceptWorkspaceInvite posts an EMPTY body to the accept route (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await acceptWorkspaceInvite(client, { inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/accept",
      {}
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("declineWorkspaceInvite posts an EMPTY body to the decline route (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await declineWorkspaceInvite(client, { inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/decline",
      {}
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("fetchMyWorkspaceInvites hits /me/workspace-invites with NO params (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMyWorkspaceInvites(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/me/workspace-invites");
    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("fetchWorkspaceInvites (outbox) and fetchMyWorkspaceInvites (inbox) hit different routes", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceInvites(client, { workspaceId: "w1" });
    await fetchMyWorkspaceInvites(client);
    expect(projectInstance.get.mock.calls.map((c) => c[0])).toEqual([
      "/workspaces/w1/invites",
      "/me/workspace-invites",
    ]);
  });
});

describe("js-sdk workspaces — authority request shaping", () => {
  it("fetchWorkspaceAuthority hits /workspaces/:id/authority/me with NO params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchWorkspaceAuthority(client, { workspaceId: "w1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/workspaces/w1/authority/me"
    );
    expectNoActorUserIdAnywhere(projectInstance);
  });
});

describe("js-sdk workspaces — no actor field on the client surface (Rule A)", () => {
  // @sublay/js never exposes an acting-user field: the bearer token IS the
  // actor. There is deliberately no defensive strip — a caller who casts past
  // the props type and hand-writes an actor gets a 403 from the server rather
  // than a silently swallowed field. What the tests below lock in is that the
  // wrappers never MANUFACTURE an actor, and that the target user ids that do
  // exist (the invitee, the `:userId` path segment) still reach the wire.

  it("the destructuring functions never manufacture an actor userId", async () => {
    const { client, projectInstance } = makeClient();
    // These pick named fields rather than spreading, so a smuggled `userId` is
    // dropped by construction. The sweep locks that in — it fails the day one
    // of them is refactored to a verbatim spread.
    await fetchWorkspace(client, {
      workspaceId: "w1",
      include: "memberCount",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await updateWorkspaceInheritFlag(client, {
      workspaceId: "w1",
      inheritsFromParent: false,
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await deleteWorkspace(client, {
      workspaceId: "w1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await leaveWorkspace(client, {
      workspaceId: "w1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await fetchWorkspaceMemberStanding(client, {
      workspaceId: "w1",
      targetUserId: "u-t",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await removeWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "u-t",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await removeWorkspaceMemberFromSubtree(client, {
      workspaceId: "w1",
      targetUserId: "u-t",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await fetchWorkspaceInvites(client, {
      workspaceId: "w1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await revokeWorkspaceInvite(client, {
      workspaceId: "w1",
      inviteId: "i1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await resendWorkspaceInvite(client, {
      workspaceId: "w1",
      inviteId: "i1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await acceptWorkspaceInvite(client, {
      inviteId: "i1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await declineWorkspaceInvite(client, {
      inviteId: "i2",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    await fetchWorkspaceAuthority(client, {
      workspaceId: "w1",
      // @ts-expect-error actor override is node-sdk-only
      userId: "someone-else",
    });
    // `fetchMyWorkspaceInvites` takes no payload at all — nothing to smuggle.
    await fetchMyWorkspaceInvites(client);

    expectNoActorUserIdAnywhere(projectInstance);
  });

  it("createWorkspaceInvite's `userId` is the invite TARGET — it must survive to the wire", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspaceInvite(client, {
      workspaceId: "w1",
      userId: "invitee1",
      rank: 1,
    });
    const [, body] = projectInstance.post.mock.calls[0];
    // The target userId IS allowed here (it addresses the invitee, not the actor).
    expect(body).toEqual({ userId: "invitee1", rank: 1 });
  });

  it("the member routes keep the TARGET user in the PATH", async () => {
    const { client, projectInstance } = makeClient();
    await updateWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "u-t",
      title: "Lead",
    });
    await removeWorkspaceMember(client, {
      workspaceId: "w1",
      targetUserId: "u-t",
    });
    await fetchWorkspaceMemberStanding(client, {
      workspaceId: "w1",
      targetUserId: "u-t",
    });
    expect(projectInstance.patch.mock.calls[0][0]).toBe(
      "/workspaces/w1/members/u-t"
    );
    expect(projectInstance.delete.mock.calls[0][0]).toBe(
      "/workspaces/w1/members/u-t"
    );
    expect(projectInstance.get.mock.calls[0][0]).toBe(
      "/workspaces/w1/members/u-t"
    );
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toEqual({ title: "Lead" });
    expect(body).not.toHaveProperty("targetUserId");
    expect(body).not.toHaveProperty("userId");
  });
});

describe("js-sdk workspaces — response mapping", () => {
  it("createWorkspace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const workspace = { id: "w1", name: "Acme" };
    projectInstance.post.mockResolvedValueOnce({ data: workspace });
    await expect(createWorkspace(client, { name: "Acme" })).resolves.toEqual(
      workspace
    );
  });

  it("fetchManyWorkspaces returns the full envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "w1" }],
      pagination: { page: 1, limit: 10, total: 1 },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchManyWorkspaces(client)).resolves.toEqual(envelope);
  });

  it("fetchWorkspaceAuthority returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const authority = {
      reasons: ["member"],
      capabilities: ["invite"],
      permissions: [],
      rank: 3,
    };
    projectInstance.get.mockResolvedValueOnce({ data: authority });
    await expect(
      fetchWorkspaceAuthority(client, { workspaceId: "w1" })
    ).resolves.toEqual(authority);
  });

  it("deleteWorkspace returns the message envelope", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({
      data: { message: "Workspace deleted successfully." },
    });
    await expect(
      deleteWorkspace(client, { workspaceId: "w1" })
    ).resolves.toEqual({ message: "Workspace deleted successfully." });
  });

  it("fetchWorkspaceInvites returns the { data } envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "i1", status: "pending" }] };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchWorkspaceInvites(client, { workspaceId: "w1" })
    ).resolves.toEqual(envelope);
  });

  it("fetchWorkspaceMemberStanding returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const standing = {
      user: { id: "u-t" },
      reasons: ["member"],
      capabilities: [],
      permissions: [],
      rank: 2,
      title: null,
      metadata: {},
    };
    projectInstance.get.mockResolvedValueOnce({ data: standing });
    await expect(
      fetchWorkspaceMemberStanding(client, {
        workspaceId: "w1",
        targetUserId: "u-t",
      })
    ).resolves.toEqual(standing);
  });

  it("removeWorkspaceMemberFromSubtree returns the removal report", async () => {
    const { client, projectInstance } = makeClient();
    const report = {
      removedCount: 2,
      removed: [
        { workspaceId: "w1", userId: "u-t" },
        { workspaceId: "w2", userId: "u-t" },
      ],
    };
    projectInstance.post.mockResolvedValueOnce({ data: report });
    await expect(
      removeWorkspaceMemberFromSubtree(client, {
        workspaceId: "w1",
        targetUserId: "u-t",
      })
    ).resolves.toEqual(report);
  });

  it("leaveWorkspace and removeWorkspaceMember resolve void (204 routes)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValue({ data: undefined });
    await expect(
      leaveWorkspace(client, { workspaceId: "w1" })
    ).resolves.toBeUndefined();
    await expect(
      removeWorkspaceMember(client, { workspaceId: "w1", targetUserId: "u-t" })
    ).resolves.toBeUndefined();
  });
});
