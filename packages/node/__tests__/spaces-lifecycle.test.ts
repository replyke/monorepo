import {
  checkSlugAvailability,
  createSpace,
  deleteSpace,
  fetchChildSpaces,
  fetchManySpaces,
  fetchMutualSpaces,
  fetchSpace,
  fetchSpaceBreadcrumb,
  fetchSpaceByShortId,
  fetchSpaceBySlug,
  fetchUserSpaces,
  updateSpace,
} from "../src/modules/spaces";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk spaces (lifecycle) — request shaping", () => {
  it("createSpace posts the full body to /spaces", async () => {
    const { client, projectInstance } = makeClient();
    await createSpace(client, { userId: "u1", name: "My Space" });
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces", {
      userId: "u1",
      name: "My Space",
    });
  });

  it("createSpace forwards visibility in the body", async () => {
    const { client, projectInstance } = makeClient();
    await createSpace(client, {
      userId: "u1",
      name: "My Space",
      visibility: "private",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces", {
      userId: "u1",
      name: "My Space",
      visibility: "private",
    });
  });

  it("fetchManySpaces hits /spaces with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchManySpaces(client, { sortBy: "newest", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces", {
      params: { sortBy: "newest", page: 1 },
    });
  });

  it("fetchSpace hits /spaces/:id with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpace(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1");
  });

  it("fetchSpaceByShortId hits /spaces/by-short-id with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceByShortId(client, { shortId: "sh1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/by-short-id", {
      params: { shortId: "sh1" },
    });
  });

  it("fetchSpaceBySlug hits /spaces/by-slug with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceBySlug(client, { slug: "my-space" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/by-slug", {
      params: { slug: "my-space" },
    });
  });

  it("checkSlugAvailability hits /spaces/check-slug with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await checkSlugAvailability(client, { slug: "my-space" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/check-slug", {
      params: { slug: "my-space" },
    });
  });

  it("fetchUserSpaces hits /spaces/user-spaces with the full body as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserSpaces(client, { userId: "u1", role: "admin" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/user-spaces", {
      params: { userId: "u1", role: "admin" },
    });
  });

  it("fetchChildSpaces strips spaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchChildSpaces(client, { spaceId: "s1", page: 2 });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/children", {
      params: { page: 2 },
    });
  });

  it("fetchSpaceBreadcrumb hits the breadcrumb route with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceBreadcrumb(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/breadcrumb");
  });

  it("fetchMutualSpaces puts the target userId in the path, actingUserId as a param", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMutualSpaces(client, { userId: "target1", actingUserId: "acting1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/mutual/target1", {
      params: { actingUserId: "acting1" },
    });
  });

  it("updateSpace strips spaceId into the path and patches the rest", async () => {
    const { client, projectInstance } = makeClient();
    await updateSpace(client, { spaceId: "s1", name: "New name" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/spaces/s1", {
      name: "New name",
    });
  });

  it("updateSpace forwards visibility in the body", async () => {
    const { client, projectInstance } = makeClient();
    await updateSpace(client, { spaceId: "s1", visibility: "unlisted" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/spaces/s1", {
      visibility: "unlisted",
    });
  });

  it("deleteSpace deletes /spaces/:id", async () => {
    const { client, projectInstance } = makeClient();
    await deleteSpace(client, { spaceId: "s1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/spaces/s1");
  });
});

describe("node-sdk spaces (lifecycle) — response mapping", () => {
  it("createSpace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", name: "My Space" };
    projectInstance.post.mockResolvedValueOnce({ data: space });
    await expect(
      createSpace(client, { userId: "u1", name: "My Space" }),
    ).resolves.toEqual(space);
  });

  it("fetchManySpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "s1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(fetchManySpaces(client, {})).resolves.toEqual(envelope);
  });

  it("fetchSpace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1" };
    projectInstance.get.mockResolvedValueOnce({ data: space });
    await expect(fetchSpace(client, { spaceId: "s1" })).resolves.toEqual(space);
  });

  it("fetchSpaceByShortId returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1" };
    projectInstance.get.mockResolvedValueOnce({ data: space });
    await expect(
      fetchSpaceByShortId(client, { shortId: "sh1" }),
    ).resolves.toEqual(space);
  });

  it("fetchSpaceBySlug returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1" };
    projectInstance.get.mockResolvedValueOnce({ data: space });
    await expect(
      fetchSpaceBySlug(client, { slug: "my-space" }),
    ).resolves.toEqual(space);
  });

  it("checkSlugAvailability returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { available: true };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(
      checkSlugAvailability(client, { slug: "my-space" }),
    ).resolves.toEqual(result);
  });

  it("fetchUserSpaces returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { data: [{ id: "s1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: result });
    await expect(fetchUserSpaces(client, { userId: "u1" })).resolves.toEqual(result);
  });

  it("fetchChildSpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "s2" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchChildSpaces(client, { spaceId: "s1" }),
    ).resolves.toEqual(envelope);
  });

  it("fetchSpaceBreadcrumb returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const breadcrumb = [{ id: "s1", name: "Root" }];
    projectInstance.get.mockResolvedValueOnce({ data: breadcrumb });
    await expect(
      fetchSpaceBreadcrumb(client, { spaceId: "s1" }),
    ).resolves.toEqual(breadcrumb);
  });

  it("fetchMutualSpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "s3" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });
    await expect(
      fetchMutualSpaces(client, { userId: "target1", actingUserId: "acting1" }),
    ).resolves.toEqual(envelope);
  });

  it("updateSpace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", name: "New name" };
    projectInstance.patch.mockResolvedValueOnce({ data: space });
    await expect(
      updateSpace(client, { spaceId: "s1", name: "New name" }),
    ).resolves.toEqual(space);
  });

  it("deleteSpace returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { deleted: true };
    projectInstance.delete.mockResolvedValueOnce({ data: result });
    await expect(deleteSpace(client, { spaceId: "s1" })).resolves.toEqual(result);
  });
});
