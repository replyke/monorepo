import { setSpaceEntityNsfw, fetchManySpaces } from "../src/modules/spaces";
import { createEntity, updateEntity, fetchManyEntities } from "../src/modules/entities";
import { createSpace, updateSpace } from "../src/modules/spaces";
import { makeClient } from "./helpers/mockClient";
import type { Entity } from "../src/interfaces/Entity";
import type { Space } from "../src/interfaces/Space";

/**
 * NSFW flagging surface (Phase 5, Task 5.2). Asserts the new mod function hits
 * the exact server route `.../spaces/:spaceId/entities/:entityId/nsfw` and that
 * the `nsfw` create/update flags + `nsfwFilter` fetch param are shaped through
 * to the request. Type-level assertions below guard the interface fields.
 */
describe("node-sdk NSFW — request shaping", () => {
  it("setSpaceEntityNsfw patches /spaces/:spaceId/entities/:entityId/nsfw with { nsfw }", async () => {
    const { client, projectInstance } = makeClient();
    await setSpaceEntityNsfw(client, {
      spaceId: "s1",
      entityId: "e1",
      nsfw: true,
    });
    expect(projectInstance.patch).toHaveBeenCalledWith(
      "/spaces/s1/entities/e1/nsfw",
      { nsfw: true },
    );
  });

  it("setSpaceEntityNsfw returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { message: "Entity NSFW flag updated.", nsfw: true };
    projectInstance.patch.mockResolvedValueOnce({ data: result });
    await expect(
      setSpaceEntityNsfw(client, { spaceId: "s1", entityId: "e1", nsfw: true }),
    ).resolves.toEqual(result);
  });

  it("createEntity forwards the own nsfw flag in the body", async () => {
    const { client, projectInstance } = makeClient();
    await createEntity(client, { nsfw: true });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/entities",
      expect.objectContaining({ nsfw: true }),
    );
  });

  it("updateEntity forwards the own nsfw flag in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateEntity(client, { entityId: "e1", nsfw: false });
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toEqual(expect.objectContaining({ nsfw: false }));
  });

  it("fetchManyEntities forwards nsfwFilter into the query params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManyEntities(client, { nsfwFilter: "only" });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).toEqual(expect.objectContaining({ nsfwFilter: "only" }));
  });

  it("createSpace forwards the own nsfw flag in the body", async () => {
    const { client, projectInstance } = makeClient();
    await createSpace(client, { name: "NSFW space", userId: "u1", nsfw: true });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/spaces",
      expect.objectContaining({ nsfw: true }),
    );
  });

  it("updateSpace forwards the own nsfw flag in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateSpace(client, { spaceId: "s1", nsfw: true });
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toEqual(expect.objectContaining({ nsfw: true }));
  });

  it("fetchManySpaces forwards nsfwFilter into the query params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManySpaces(client, { nsfwFilter: "exclude" });
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config.params).toEqual(expect.objectContaining({ nsfwFilter: "exclude" }));
  });
});

// Compile-time guards: the model interfaces carry the new NSFW fields. These
// are type-level assertions — if the fields are dropped or mistyped, `tsc`
// (and the jest ts-jest transform) fails to compile this file.
describe("node-sdk NSFW — interface fields (type-level)", () => {
  it("Entity exposes nsfw + nsfwEffective as booleans", () => {
    const e = {} as Entity;
    const nsfw: boolean | undefined = e.nsfw;
    const eff: boolean | undefined = e.nsfwEffective;
    expect([nsfw, eff]).toBeDefined();
  });

  it("Space exposes nsfw + nsfwEffective as booleans", () => {
    const s = {} as Space;
    const nsfw: boolean | undefined = s.nsfw;
    const eff: boolean | undefined = s.nsfwEffective;
    expect([nsfw, eff]).toBeDefined();
  });
});
