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
import { makeClient } from "./helpers/client";

describe("js-sdk collections — request shaping", () => {
  it("fetchRootCollection gets /collections/root with no params (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchRootCollection(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/collections/root");
    const [, config] = projectInstance.get.mock.calls[0];
    expect(config).toBeUndefined();
  });

  it("fetchSubCollections gets /collections/:collectionId/sub-collections with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSubCollections(client, { collectionId: "col1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/collections/col1/sub-collections"
    );
  });

  it("createNewCollection posts the rest of the body to /collections/:collectionId/sub-collections (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await createNewCollection(client, {
      collectionId: "col1",
      collectionName: "Favorites",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/collections/col1/sub-collections",
      { collectionName: "Favorites" }
    );
  });

  it("fetchCollectionEntities gets /collections/:collectionId/entities with the rest as params (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchCollectionEntities(client, {
      collectionId: "col1",
      page: 1,
      limit: 20,
      sortBy: "top",
      sortDir: "desc",
      include: "user",
    });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/collections/col1/entities",
      {
        params: { page: 1, limit: 20, sortBy: "top", sortDir: "desc", include: "user" },
      }
    );
  });

  it("addEntityToCollection posts only entityId to /collections/:collectionId/entities (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await addEntityToCollection(client, {
      collectionId: "col1",
      entityId: "e1",
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/collections/col1/entities",
      { entityId: "e1" }
    );
  });

  it("removeEntityFromCollection deletes /collections/:collectionId/entities/:entityId with no params (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await removeEntityFromCollection(client, {
      collectionId: "col1",
      entityId: "e1",
    });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/collections/col1/entities/e1"
    );
  });

  it("updateCollection patches /collections/:collectionId with the rest of the body (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await updateCollection(client, { collectionId: "col1", name: "Renamed" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/collections/col1", {
      name: "Renamed",
    });
  });

  it("deleteCollection deletes /collections/:collectionId with no params (no userId)", async () => {
    const { client, projectInstance } = makeClient();
    await deleteCollection(client, { collectionId: "col1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/collections/col1"
    );
  });
});

describe("js-sdk collections — response mapping", () => {
  it("fetchRootCollection returns the Collection", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "col1", name: "Root", parentId: null };
    projectInstance.get.mockResolvedValueOnce({ data: collection });

    const result = await fetchRootCollection(client);

    expect(result).toEqual(collection);
  });

  it("fetchSubCollections returns an array of Collections", async () => {
    const { client, projectInstance } = makeClient();
    const collections = [{ id: "col2", name: "Sub" }];
    projectInstance.get.mockResolvedValueOnce({ data: collections });

    const result = await fetchSubCollections(client, { collectionId: "col1" });

    expect(result).toEqual(collections);
  });

  it("createNewCollection returns the created Collection", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "col2", name: "Favorites", parentId: "col1" };
    projectInstance.post.mockResolvedValueOnce({ data: collection });

    const result = await createNewCollection(client, {
      collectionId: "col1",
      collectionName: "Favorites",
    });

    expect(result).toEqual(collection);
  });

  it("fetchCollectionEntities returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "e1" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchCollectionEntities(client, {
      collectionId: "col1",
    });

    expect(result).toEqual(envelope);
  });

  it("addEntityToCollection returns the mutation response", async () => {
    const { client, projectInstance } = makeClient();
    const mutationResult = {
      success: true,
      collection: { id: "col1", entityCount: 5 },
    };
    projectInstance.post.mockResolvedValueOnce({ data: mutationResult });

    const result = await addEntityToCollection(client, {
      collectionId: "col1",
      entityId: "e1",
    });

    expect(result).toEqual(mutationResult);
  });

  it("removeEntityFromCollection returns the mutation response", async () => {
    const { client, projectInstance } = makeClient();
    const mutationResult = {
      success: true,
      collection: { id: "col1", entityCount: 4 },
    };
    projectInstance.delete.mockResolvedValueOnce({ data: mutationResult });

    const result = await removeEntityFromCollection(client, {
      collectionId: "col1",
      entityId: "e1",
    });

    expect(result).toEqual(mutationResult);
  });

  it("updateCollection returns the updated Collection", async () => {
    const { client, projectInstance } = makeClient();
    const collection = { id: "col1", name: "Renamed" };
    projectInstance.patch.mockResolvedValueOnce({ data: collection });

    const result = await updateCollection(client, {
      collectionId: "col1",
      name: "Renamed",
    });

    expect(result).toEqual(collection);
  });

  it("deleteCollection resolves to undefined (void, response.data is discarded)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: { ignored: true } });

    const result = await deleteCollection(client, { collectionId: "col1" });

    expect(result).toBeUndefined();
  });
});
