import { createGrant, listGrants } from "../src/modules/reputation";
import * as Reputation from "../src/modules/reputation";
import { getMessage, listMessages } from "../src/modules/chat";
import type { ReputationGrantTargetFilter } from "../src/interfaces/ReputationGrant";
import { makeClient } from "./helpers/client";

describe("js-sdk reputation — request shaping", () => {
  it("createGrant posts /reputation-grants with the server's exact field names", async () => {
    const { client, projectInstance } = makeClient();
    await createGrant(client, {
      recipientId: "recipient-1",
      amount: 25,
      spaceId: "space-1",
      note: "great answer",
      metadata: { source: "answer-card" },
      targetType: "comment",
      targetId: "comment-1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/reputation-grants", {
      recipientId: "recipient-1",
      amount: 25,
      spaceId: "space-1",
      note: "great answer",
      metadata: { source: "answer-card" },
      targetType: "comment",
      targetId: "comment-1",
    });
  });

  it("createGrant never sends an actor field — the sender comes from the token", async () => {
    const { client, projectInstance } = makeClient();
    await createGrant(client, { recipientId: "recipient-1", amount: 5 });
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("actingUserId");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("senderId");
  });

  it("listGrants gets /reputation-grants with the full filter as params", async () => {
    const { client, projectInstance } = makeClient();
    await listGrants(client, {
      recipientId: "recipient-1",
      page: 2,
      limit: 50,
      include: "user",
      spaceReputation: { spaceId: "context" },
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/reputation-grants", {
      params: {
        recipientId: "recipient-1",
        page: 2,
        limit: 50,
        include: "user",
        spaceReputationId: "context",
      },
    });
  });

  it("listGrants flattens the spaceReputation object — never bracket-encoded", async () => {
    const { client, projectInstance } = makeClient();
    await listGrants(client, {
      senderId: "sender-1",
      spaceReputation: { spaceId: "space-1", includeDescendants: true },
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/reputation-grants", {
      params: {
        senderId: "sender-1",
        spaceReputationId: "space-1",
        spaceReputationDescendants: true,
      },
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).not.toHaveProperty("spaceReputation");
  });

  it("listGrants passes the target filter shape through", async () => {
    const { client, projectInstance } = makeClient();
    await listGrants(client, {
      targetType: "chat-message",
      targetId: "message-1",
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/reputation-grants", {
      params: { targetType: "chat-message", targetId: "message-1" },
    });
  });
});

describe("js-sdk reputation — response mapping", () => {
  it("createGrant returns the created grant row bare (not wrapped)", async () => {
    const { client, projectInstance } = makeClient();
    const grant = { id: "grant-1", sourceType: "user", amount: 25 };
    projectInstance.post.mockResolvedValueOnce({ data: grant });
    await expect(
      createGrant(client, { recipientId: "recipient-1", amount: 25 })
    ).resolves.toEqual(grant);
  });

  it("listGrants returns the page envelope plus the summary block", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "grant-1" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
      summary: { total: 120, count: 3, viewerTotal: 0 },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      listGrants(client, { targetType: "entity", targetId: "entity-1" })
    ).resolves.toEqual(envelope);
  });
});

describe("js-sdk reputation — surface", () => {
  it("exposes no mintGrant — a user token can never mint", () => {
    expect(Reputation).not.toHaveProperty("mintGrant");
    expect(Object.keys(Reputation).sort()).toEqual(["createGrant", "listGrants"]);
  });

  it("exposes the bound module on SublayClient (import / field / bindModule all wired)", async () => {
    const { SublayClient } = await import("../src/index");
    const { client: http, projectInstance } = makeClient();
    // The constructor is TS-private only; it exists at runtime.
    const sublay = new (SublayClient as any)(http);

    expect(typeof sublay.reputation.createGrant).toBe("function");
    expect(typeof sublay.reputation.listGrants).toBe("function");
    expect(sublay.reputation.mintGrant).toBeUndefined();

    await sublay.reputation.createGrant({ recipientId: "r1", amount: 10 });
    expect(projectInstance.post).toHaveBeenCalledWith("/reputation-grants", {
      recipientId: "r1",
      amount: 10,
    });
  });
});

describe("js-sdk reputation — chat grants include", () => {
  it("getMessage forwards include=grants (the Phase 3 single-message include)", async () => {
    const { client, projectInstance } = makeClient();
    await getMessage(client, {
      conversationId: "conversation-1",
      messageId: "message-1",
      include: "grants",
    });
    const [url, config] = projectInstance.get.mock.calls[0];
    expect(url).toBe(
      "/chat/conversations/conversation-1/messages/message-1"
    );
    expect(config.params.include).toBe("grants");
  });

  it("listMessages accepts the composed files,grants include token", async () => {
    const { client, projectInstance } = makeClient();
    await listMessages(client, {
      conversationId: "conversation-1",
      include: "files,grants",
    });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params.include).toBe("files,grants");
  });
});

describe("js-sdk reputation — nullability contract", () => {
  it("pins note/spaceId as nullable and metadata as NOT nullable", async () => {
    // COMPILE-TIME assertions, checked by ts-jest's diagnostics. The server's
    // shared `metadataSchema` is `z.record(...).optional()` with NO
    // `.nullable()`, while `note` and `spaceId` are `.nullable().optional()`.
    // The `@ts-expect-error` fails this file's compile if anyone re-adds
    // `| null` to `metadata` — a shape the server answers with
    // 400 reputation-grant/invalid-body.
    const { client, projectInstance } = makeClient();

    await createGrant(client, {
      recipientId: "recipient-1",
      amount: 5,
      spaceId: null,
      note: null,
      // @ts-expect-error metadata is not nullable — omit the key instead.
      metadata: null,
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
  });

  it("omitting metadata leaves the key off the wire entirely", async () => {
    const { client, projectInstance } = makeClient();
    await createGrant(client, { recipientId: "recipient-1", amount: 5 });
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("metadata");
  });
});

describe("js-sdk reputation — target pair contract", () => {
  // COMPILE-TIME assertions, checked by ts-jest's diagnostics. The server
  // applies a shared `bothOrNeitherTarget` refinement to the write body and the
  // equivalent rule to the list query, answering a half-filled target with
  // `400 reputation-grant/invalid-body` / `invalid-filter`. The
  // `@ts-expect-error` lines below fail this file's compile if anyone flattens
  // `ReputationGrantTargetFilter` back into two independent optional fields.
  it("rejects a half-filled target at compile time on createGrant", async () => {
    const { client, projectInstance } = makeClient();

    // @ts-expect-error targetType without targetId is a half-filled target.
    await createGrant(client, {
      recipientId: "recipient-1",
      amount: 5,
      targetType: "entity",
    });

    // @ts-expect-error targetId without targetType is a half-filled target.
    await createGrant(client, {
      recipientId: "recipient-1",
      amount: 5,
      targetId: "entity-1",
    });

    // Both keys omitted: the targetless grant, which is valid.
    await createGrant(client, { recipientId: "recipient-1", amount: 5 });
    const [, targetless] = projectInstance.post.mock.calls[2];
    expect(targetless).not.toHaveProperty("targetType");
    expect(targetless).not.toHaveProperty("targetId");

    // The complete pair.
    await createGrant(client, {
      recipientId: "recipient-1",
      amount: 5,
      targetType: "entity",
      targetId: "entity-1",
    });
    const [, paired] = projectInstance.post.mock.calls[3];
    expect(paired).toMatchObject({
      targetType: "entity",
      targetId: "entity-1",
    });
  });

  it("rejects a half-filled target at compile time on listGrants", async () => {
    const { client, projectInstance } = makeClient();

    // @ts-expect-error targetType without targetId is a half-filled target.
    await listGrants(client, { targetType: "chat-message" });

    // @ts-expect-error targetId without targetType is a half-filled target.
    await listGrants(client, { targetId: "message-1" });

    // A different filter shape with a stray half target is rejected too — the
    // pairing rule is independent of which shape the caller meant to use.
    // @ts-expect-error recipientId does not license a lone targetType.
    await listGrants(client, { recipientId: "r1", targetType: "entity" });

    await listGrants(client, { recipientId: "r1" });
    await listGrants(client, {
      targetType: "chat-message",
      targetId: "message-1",
    });
    const [, complete] = projectInstance.get.mock.calls[4];
    expect(complete.params).toMatchObject({
      targetType: "chat-message",
      targetId: "message-1",
    });
  });

  it("rejects an explicit null target at compile time — the empty branch is undefined, not null", async () => {
    // COMPILE-TIME assertions, same shape as the `metadata: null` case above
    // and for the same reason: `grantBodyFields.targetType`/`targetId` are
    // `.optional()` with NO `.nullable()`, so `targetType: null` is answered
    // with 400 reputation-grant/invalid-body (invalid-filter on the list), not
    // read as "no target". The empty branch of
    // `ReputationGrantTargetFilter` is therefore `?: undefined`, and these
    // directives go unused — failing the compile — the moment anyone widens it
    // to `?: null`. Omit both keys to mean "no target".
    const { client, projectInstance } = makeClient();

    await createGrant(client, {
      recipientId: "recipient-1",
      amount: 5,
      // @ts-expect-error the target pair is not nullable — omit both keys.
      targetType: null,
      // @ts-expect-error the target pair is not nullable — omit both keys.
      targetId: null,
    });

    await listGrants(client, {
      recipientId: "r1",
      // @ts-expect-error the target pair is not nullable — omit both keys.
      targetType: null,
      // @ts-expect-error the target pair is not nullable — omit both keys.
      targetId: null,
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    expect(projectInstance.get).toHaveBeenCalledTimes(1);
  });

  it("lets a caller build the pair conditionally via the exported filter type", async () => {
    // The documented escape hatch for the one shape the union makes awkward:
    // an inline `...(item ? { targetType, targetId } : {})` widens both keys to
    // `T | undefined` and matches neither branch, so name the type on a helper
    // and spread that instead.
    const { client, projectInstance } = makeClient();
    const build = (item: { id: string } | null): ReputationGrantTargetFilter =>
      item ? { targetType: "entity", targetId: item.id } : {};

    await listGrants(client, { recipientId: "r1", ...build(null) });
    await listGrants(client, { ...build({ id: "entity-1" }) });

    expect(projectInstance.get.mock.calls[0][1].params).not.toHaveProperty(
      "targetType"
    );
    expect(projectInstance.get.mock.calls[1][1].params).toMatchObject({
      targetType: "entity",
      targetId: "entity-1",
    });
  });
});
