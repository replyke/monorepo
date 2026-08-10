import {
  createWorkspace,
  fetchWorkspace,
  fetchManyWorkspaces,
  fetchMembers,
  createInvite,
  acceptInvite,
  declineInvite,
  fetchMyInvites,
  getAuthority,
} from "../src/modules/workspaces";
import { makeClient } from "./helpers/client";

/**
 * Recursively asserts that no acting-user `userId` leaks into a client call.
 * The bearer token is the actor for @sublay/js, so the server derives the
 * actor — sending a `userId` would be Rule A's classic porting mistake (403 /
 * silently ignored). NOTE: `createInvite`'s `userId` is the invite TARGET, not
 * an actor, so it is legitimately allowed and is asserted separately.
 */
function expectNoActorUserId(payload: unknown): void {
  if (payload == null || typeof payload !== "object") return;
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    expect(key).not.toBe("userId");
    expect(key).not.toBe("actingUserId");
    if (value && typeof value === "object") expectNoActorUserId(value);
  }
}

describe("js-sdk workspaces — request shaping", () => {
  it("createWorkspace posts the body to /workspaces (no actor userId)", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, { name: "Acme" });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces", {
      name: "Acme",
    });
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

  it("createInvite strips workspaceId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await createInvite(client, {
      workspaceId: "w1",
      email: "New.Member@Example.com",
      capabilities: ["invite"],
      rank: 2,
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/workspaces/w1/invites", {
      email: "New.Member@Example.com",
      capabilities: ["invite"],
      rank: 2,
    });
  });

  it("acceptInvite posts an EMPTY body to the accept route (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await acceptInvite(client, { inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/accept",
      {}
    );
  });

  it("declineInvite posts an EMPTY body to the decline route (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await declineInvite(client, { inviteId: "i1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/workspace-invites/i1/decline",
      {}
    );
  });

  it("fetchMyInvites hits /me/workspace-invites with NO params (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMyInvites(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/me/workspace-invites");
  });

  it("getAuthority hits /workspaces/:id/authority/me with NO params (actor from token)", async () => {
    const { client, projectInstance } = makeClient();
    await getAuthority(client, { workspaceId: "w1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/workspaces/w1/authority/me"
    );
  });
});

describe("js-sdk workspaces — NO actor userId leaks into client calls (Rule A)", () => {
  it("createWorkspace body carries no userId/actingUserId", async () => {
    const { client, projectInstance } = makeClient();
    await createWorkspace(client, {
      name: "Team",
      metadata: { owner: "x" },
      parentWorkspaceId: "w-parent",
    });
    const [, body] = projectInstance.post.mock.calls[0];
    expectNoActorUserId(body);
  });

  it("fetchManyWorkspaces sends no userId param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyWorkspaces(client, { page: 1, limit: 5 });
    const [, config] = projectInstance.get.mock.calls[0];
    expectNoActorUserId(config?.params);
  });

  it("fetchMembers sends no userId param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMembers(client, { workspaceId: "w1", countOnly: true });
    const [, config] = projectInstance.get.mock.calls[0];
    expectNoActorUserId(config?.params);
  });

  it("acceptInvite / declineInvite send an empty body (no actor userId)", async () => {
    const { client, projectInstance } = makeClient();
    await acceptInvite(client, { inviteId: "i1" });
    await declineInvite(client, { inviteId: "i2" });
    for (const call of projectInstance.post.mock.calls) {
      expectNoActorUserId(call[1]);
    }
  });

  it("fetchMyInvites sends no userId (matched by token server-side)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMyInvites(client);
    // Called with the URL only — no config/params object carrying a userId.
    expect(projectInstance.get.mock.calls[0]).toEqual(["/me/workspace-invites"]);
  });

  it("getAuthority sends no userId (bearer-token user's own standing)", async () => {
    const { client, projectInstance } = makeClient();
    await getAuthority(client, { workspaceId: "w1" });
    expect(projectInstance.get.mock.calls[0]).toEqual([
      "/workspaces/w1/authority/me",
    ]);
  });

  it("createInvite's `userId` is the invite TARGET — legitimately present in the body", async () => {
    const { client, projectInstance } = makeClient();
    await createInvite(client, { workspaceId: "w1", userId: "invitee1", rank: 1 });
    const [, body] = projectInstance.post.mock.calls[0];
    // The target userId IS allowed here (it addresses the invitee, not the actor).
    expect(body).toEqual({ userId: "invitee1", rank: 1 });
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

  it("getAuthority returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const authority = {
      reasons: ["member"],
      capabilities: ["invite"],
      permissions: [],
      rank: 3,
    };
    projectInstance.get.mockResolvedValueOnce({ data: authority });
    await expect(
      getAuthority(client, { workspaceId: "w1" })
    ).resolves.toEqual(authority);
  });
});
