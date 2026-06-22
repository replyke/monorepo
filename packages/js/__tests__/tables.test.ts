import {
  bulkCreate,
  bulkDelete,
  create,
  deleteRow,
  find,
  findOne,
  restore,
  update,
} from "../src/modules/tables";
import { makeClient as makeBaseClient } from "./helpers/client";

/** Tables module expects richer default response shapes than the shared helper's `{}`. */
function makeClient() {
  const { client, projectInstance } = makeBaseClient();
  projectInstance.get.mockResolvedValue({
    data: { data: [], pagination: {}, row: { id: "1" } },
  });
  projectInstance.post.mockResolvedValue({
    data: { row: { id: "1" }, rows: [{ id: "1" }] },
  });
  projectInstance.patch.mockResolvedValue({ data: { row: { id: "1" } } });
  projectInstance.delete.mockResolvedValue({
    data: { deleted: true, soft: true, deletedCount: 1 },
  });
  return { client, projectInstance };
}

describe("js-sdk custom-table row ops — request shaping (no DDL surface)", () => {
  it("find serializes filters + includeDeleted", async () => {
    const { client, projectInstance } = makeClient();
    await find(client, "Events", {
      page: 1,
      limit: 20,
      filters: [{ column: "name", operator: "eq", value: "x" }],
      includeDeleted: false,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/db/Events", {
      params: {
        page: 1,
        limit: 20,
        filters: JSON.stringify([{ column: "name", operator: "eq", value: "x" }]),
        includeDeleted: "false",
      },
    });
  });

  it("findOne / create / bulkCreate / update hit the right routes", async () => {
    const { client, projectInstance } = makeClient();
    await findOne(client, "Events", "id1");
    expect(projectInstance.get).toHaveBeenCalledWith("/db/Events/id1");

    await create(client, "Events", { name: "x" });
    expect(projectInstance.post).toHaveBeenCalledWith("/db/Events", { name: "x" });

    await bulkCreate(client, "Events", [{ name: "a" }]);
    expect(projectInstance.post).toHaveBeenCalledWith("/db/Events/bulk", {
      rows: [{ name: "a" }],
    });

    await update(client, "Events", "id1", { name: "y" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/db/Events/id1", {
      name: "y",
    });
  });

  it("delete / bulkDelete / restore hit the right routes", async () => {
    const { client, projectInstance } = makeClient();
    await deleteRow(client, "Events", "id1", { force: true });
    expect(projectInstance.delete).toHaveBeenCalledWith("/db/Events/id1", {
      params: { force: "true" },
    });

    await bulkDelete(client, "Events", {
      filters: [{ column: "name", operator: "eq", value: "x" }],
    });
    expect(projectInstance.delete).toHaveBeenCalledWith("/db/Events", {
      data: { filters: [{ column: "name", operator: "eq", value: "x" }] },
    });

    await restore(client, "Events", "id1");
    expect(projectInstance.post).toHaveBeenCalledWith("/db/Events/id1/restore");
  });
});
