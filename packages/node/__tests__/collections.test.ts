import {
  addEntityToCollection,
  createNewCollection,
  deleteCollection,
  fetchCollectionEntities,
  fetchRootCollection,
  fetchSubCollections,
  removeEntityFromCollection,
  updateCollection,
} from "../src/modules/collections";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk collections — request shaping", () => {
  it("fetchRootCollection hits /collections/root with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchRootCollection(client, { userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/collections/root", {
      params: { userId: "u1" },
    });
  });

  it("fetchSubCollections strips collectionId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSubCollections(client, { collectionId: "c1", userId: "u1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/collections/c1/sub-collections",
      { params: { userId: "u1" } },
    );
  });

  it("createNewCollection strips collectionId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await createNewCollection(client, {
      collectionId: "c1",
      collectionName: "Favorites",
      userId: "u1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/collections/c1/sub-collections",
      { collectionName: "Favorites", userId: "u1" },
    );
  });

  it("fetchCollectionEntities strips collectionId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchCollectionEntities(client, { collectionId: "c1", userId: "u1", page: 2 });
    expect(projectInstance.get).toHaveBeenCalledWith("/collections/c1/entities", {
      params: { userId: "u1", page: 2 },
    });
  });

  it("addEntityToCollection strips collectionId into the path and posts the rest", async () => {
    const { client, projectInstance } = makeClient();
    await addEntityToCollection(client, {
      collectionId: "c1",
      entityId: "e1",
      userId: "u1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/collections/c1/entities", {
      entityId: "e1",
      userId: "u1",
    });
  });

  it("removeEntityFromCollection deletes /collections/:id/entities/:entityId with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await removeEntityFromCollection(client, {
      collectionId: "c1",
      entityId: "e1",
      userId: "u1",
    });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/collections/c1/entities/e1",
      { params: { userId: "u1" } },
    );
  });

  it("updateCollection strips collectionId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateCollection(client, { collectionId: "c1", userId: "u1", name: "New" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/collections/c1", {
      userId: "u1",
      name: "New",
    });
  });

  it("deleteCollection deletes /collections/:id with userId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await deleteCollection(client, { collectionId: "c1", userId: "u1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/collections/c1", {
      params: { userId: "u1" },
    });
  });
});

describe("node-sdk collections — response mapping", () => {
  it("fetchRootCollection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "c1", name: "root" };
    projectInstance.get.mockResolvedValueOnce({ data: collection });
    await expect(fetchRootCollection(client, { userId: "u1" })).resolves.toEqual(
      collection,
    );
  });

  it("fetchSubCollections returns response.data as an array", async () => {
    const { client, projectInstance } = makeClient();
    const collections = [{ id: "c2" }, { id: "c3" }];
    projectInstance.get.mockResolvedValueOnce({ data: collections });
    await expect(
      fetchSubCollections(client, { collectionId: "c1", userId: "u1" }),
    ).resolves.toEqual(collections);
  });

  it("createNewCollection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "c2", name: "Favorites" };
    projectInstance.post.mockResolvedValueOnce({ data: collection });
    await expect(
      createNewCollection(client, {
        collectionId: "c1",
        collectionName: "Favorites",
        userId: "u1",
      }),
    ).resolves.toEqual(collection);
  });

  it("fetchCollectionEntities returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "e1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchCollectionEntities(client, { collectionId: "c1", userId: "u1" }),
    ).resolves.toEqual(envelope);
  });

  it("addEntityToCollection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "c1" };
    projectInstance.post.mockResolvedValueOnce({ data: collection });
    await expect(
      addEntityToCollection(client, {
        collectionId: "c1",
        entityId: "e1",
        userId: "u1",
      }),
    ).resolves.toEqual(collection);
  });

  it("removeEntityFromCollection resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      removeEntityFromCollection(client, {
        collectionId: "c1",
        entityId: "e1",
        userId: "u1",
      }),
    ).resolves.toBeUndefined();
  });

  it("updateCollection returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "c1", name: "New" };
    projectInstance.patch.mockResolvedValueOnce({ data: collection });
    await expect(
      updateCollection(client, { collectionId: "c1", userId: "u1", name: "New" }),
    ).resolves.toEqual(collection);
  });

  it("deleteCollection resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      deleteCollection(client, { collectionId: "c1", userId: "u1" }),
    ).resolves.toBeUndefined();
  });
});
