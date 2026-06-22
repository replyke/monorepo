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
import {
  addColumn,
  createTable,
  dropColumn,
  dropTable,
} from "../src/modules/tables-management";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk custom-table row ops — request shaping", () => {
  it("find serializes filters to JSON and includeDeleted to a string", async () => {
    const { client, projectInstance } = makeClient();
    await find(client, "Events", {
      page: 2,
      limit: 10,
      sortBy: "rank",
      sortDir: "asc",
      filters: [{ column: "rank", operator: "gte", value: 2 }],
      includeDeleted: true,
    });
    expect(projectInstance.get).toHaveBeenCalledWith("/db/Events", {
      params: {
        page: 2,
        limit: 10,
        sortBy: "rank",
        sortDir: "asc",
        filters: JSON.stringify([{ column: "rank", operator: "gte", value: 2 }]),
        includeDeleted: "true",
      },
    });
  });

  it("findOne hits /db/:table/:id", async () => {
    const { client, projectInstance } = makeClient();
    await findOne(client, "Events", "abc");
    expect(projectInstance.get).toHaveBeenCalledWith("/db/Events/abc");
  });

  it("create posts to /db/:table", async () => {
    const { client, projectInstance } = makeClient();
    await create(client, "Events", { name: "x" });
    expect(projectInstance.post).toHaveBeenCalledWith("/db/Events", { name: "x" });
  });

  it("bulkCreate wraps rows", async () => {
    const { client, projectInstance } = makeClient();
    await bulkCreate(client, "Events", [{ name: "a" }, { name: "b" }]);
    expect(projectInstance.post).toHaveBeenCalledWith("/db/Events/bulk", {
      rows: [{ name: "a" }, { name: "b" }],
    });
  });

  it("update patches /db/:table/:id", async () => {
    const { client, projectInstance } = makeClient();
    await update(client, "Events", "id1", { name: "y" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/db/Events/id1", {
      name: "y",
    });
  });

  it("delete passes force as a query param", async () => {
    const { client, projectInstance } = makeClient();
    await deleteRow(client, "Events", "id1", { force: true });
    expect(projectInstance.delete).toHaveBeenCalledWith("/db/Events/id1", {
      params: { force: "true" },
    });
  });

  it("bulkDelete sends a body via the data option", async () => {
    const { client, projectInstance } = makeClient();
    await bulkDelete(client, "Events", { rowIds: ["a", "b"], force: false });
    expect(projectInstance.delete).toHaveBeenCalledWith("/db/Events", {
      data: { rowIds: ["a", "b"], force: false },
    });
  });

  it("restore posts to the restore route", async () => {
    const { client, projectInstance } = makeClient();
    await restore(client, "Events", "id1");
    expect(projectInstance.post).toHaveBeenCalledWith("/db/Events/id1/restore");
  });
});

describe("node-sdk custom-table row ops — response mapping", () => {
  it("find returns the full { data, pagination } envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(find(client, "Events")).resolves.toEqual(envelope);
  });

  it("findOne unwraps response.data.row", async () => {
    const { client, projectInstance } = makeClient();
    const row = { id: "abc", name: "x" };
    projectInstance.get.mockResolvedValueOnce({ data: { row } });
    await expect(findOne(client, "Events", "abc")).resolves.toEqual(row);
  });

  it("create unwraps response.data.row", async () => {
    const { client, projectInstance } = makeClient();
    const row = { id: "1", name: "x" };
    projectInstance.post.mockResolvedValueOnce({ data: { row } });
    await expect(create(client, "Events", { name: "x" })).resolves.toEqual(row);
  });

  it("bulkCreate unwraps response.data.rows", async () => {
    const { client, projectInstance } = makeClient();
    const rows = [{ id: "1" }, { id: "2" }];
    projectInstance.post.mockResolvedValueOnce({ data: { rows } });
    await expect(
      bulkCreate(client, "Events", [{ name: "a" }, { name: "b" }]),
    ).resolves.toEqual(rows);
  });

  it("update unwraps response.data.row", async () => {
    const { client, projectInstance } = makeClient();
    const row = { id: "id1", name: "y" };
    projectInstance.patch.mockResolvedValueOnce({ data: { row } });
    await expect(update(client, "Events", "id1", { name: "y" })).resolves.toEqual(row);
  });

  it("deleteRow returns the full DeleteResult", async () => {
    const { client, projectInstance } = makeClient();
    const result = { deleted: true, id: "id1" };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(deleteRow(client, "Events", "id1")).resolves.toEqual(result);
  });

  it("bulkDelete returns the full BulkDeleteResult", async () => {
    const { client, projectInstance } = makeClient();
    const result = { deletedCount: 2 };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(
      bulkDelete(client, "Events", { rowIds: ["a", "b"] }),
    ).resolves.toEqual(result);
  });

  it("restore unwraps response.data.row", async () => {
    const { client, projectInstance } = makeClient();
    const row = { id: "id1", deletedAt: null };
    projectInstance.post.mockResolvedValueOnce({ data: { row } });
    await expect(restore(client, "Events", "id1")).resolves.toEqual(row);
  });
});

describe("node-sdk table management (DDL) — request shaping", () => {
  it("createTable posts the full body to /db/tables", async () => {
    const { client, projectInstance } = makeClient();
    await createTable(client, {
      tableName: "Events",
      columns: [{ columnName: "name", dataType: "text", nullable: false }],
      timestamps: true,
      paranoid: false,
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/db/tables", {
      tableName: "Events",
      columns: [{ columnName: "name", dataType: "text", nullable: false }],
      timestamps: true,
      paranoid: false,
    });
  });

  it("dropTable deletes /db/tables/:name", async () => {
    const { client, projectInstance } = makeClient();
    await dropTable(client, { tableName: "Events" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/db/tables/Events");
  });

  it("addColumn strips tableName from the body", async () => {
    const { client, projectInstance } = makeClient();
    await addColumn(client, {
      tableName: "Events",
      columnName: "price",
      dataType: "decimal",
      nullable: true,
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/db/tables/Events/columns", {
      columnName: "price",
      dataType: "decimal",
      nullable: true,
    });
  });

  it("dropColumn deletes the column route", async () => {
    const { client, projectInstance } = makeClient();
    await dropColumn(client, { tableName: "Events", columnName: "price" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/db/tables/Events/columns/price",
    );
  });
});

describe("node-sdk table management (DDL) — response mapping", () => {
  it("createTable returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { table: "custom_Events" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      createTable(client, {
        tableName: "Events",
        columns: [{ columnName: "name", dataType: "text", nullable: false }],
        timestamps: true,
        paranoid: false,
      }),
    ).resolves.toEqual(result);
  });

  it("dropTable returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { dropped: "custom_Events" };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(dropTable(client, { tableName: "Events" })).resolves.toEqual(result);
  });

  it("addColumn returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { added: "price" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      addColumn(client, {
        tableName: "Events",
        columnName: "price",
        dataType: "decimal",
        nullable: true,
      }),
    ).resolves.toEqual(result);
  });

  it("dropColumn returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { dropped: "price" };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(
      dropColumn(client, { tableName: "Events", columnName: "price" }),
    ).resolves.toEqual(result);
  });
});
