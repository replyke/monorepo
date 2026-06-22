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

describe("js-sdk custom-table row ops — response mapping", () => {
  it("find returns the full paginated envelope as-is", async () => {
    const { client, projectInstance } = makeBaseClient();
    const envelope = {
      data: [{ id: "1", name: "x" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await find(client, "Events");

    expect(result).toEqual(envelope);
  });

  it("findOne unwraps `row` from the response", async () => {
    const { client, projectInstance } = makeBaseClient();
    const row = { id: "id1", name: "x" };
    projectInstance.get.mockResolvedValueOnce({ data: { row } });

    const result = await findOne(client, "Events", "id1");

    expect(result).toEqual(row);
  });

  it("create unwraps `row` from the response", async () => {
    const { client, projectInstance } = makeBaseClient();
    const row = { id: "id1", name: "x" };
    projectInstance.post.mockResolvedValueOnce({ data: { row } });

    const result = await create(client, "Events", { name: "x" });

    expect(result).toEqual(row);
  });

  it("bulkCreate unwraps `rows` from the response", async () => {
    const { client, projectInstance } = makeBaseClient();
    const rows = [{ id: "id1" }, { id: "id2" }];
    projectInstance.post.mockResolvedValueOnce({ data: { rows } });

    const result = await bulkCreate(client, "Events", [{ name: "a" }, { name: "b" }]);

    expect(result).toEqual(rows);
  });

  it("update unwraps `row` from the response", async () => {
    const { client, projectInstance } = makeBaseClient();
    const row = { id: "id1", name: "y" };
    projectInstance.patch.mockResolvedValueOnce({ data: { row } });

    const result = await update(client, "Events", "id1", { name: "y" });

    expect(result).toEqual(row);
  });

  it("deleteRow returns the delete result as-is", async () => {
    const { client, projectInstance } = makeBaseClient();
    const deleteResult = { deleted: true, soft: true };
    projectInstance.delete.mockResolvedValueOnce({ data: deleteResult });

    const result = await deleteRow(client, "Events", "id1");

    expect(result).toEqual(deleteResult);
  });

  it("bulkDelete returns the bulk delete result as-is", async () => {
    const { client, projectInstance } = makeBaseClient();
    const bulkDeleteResult = { deletedCount: 3, soft: true };
    projectInstance.delete.mockResolvedValueOnce({ data: bulkDeleteResult });

    const result = await bulkDelete(client, "Events", { rowIds: ["a", "b", "c"] });

    expect(result).toEqual(bulkDeleteResult);
  });

  it("restore unwraps `row` from the response", async () => {
    const { client, projectInstance } = makeBaseClient();
    const row = { id: "id1", deletedAt: null };
    projectInstance.post.mockResolvedValueOnce({ data: { row } });

    const result = await restore(client, "Events", "id1");

    expect(result).toEqual(row);
  });
});
