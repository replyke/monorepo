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
import { formDataToObject, makeClient } from "./helpers/client";

describe("js-sdk spaces (lifecycle) — request shaping", () => {
  it("createSpace posts the full body to /spaces as JSON when there is no avatar/banner", async () => {
    const { client, projectInstance } = makeClient();
    const data = { name: "My Space", slug: "my-space" };
    await createSpace(client, data);
    expect(projectInstance.post).toHaveBeenCalledWith("/spaces", data);
  });

  it("createSpace sends multipart/FormData when an avatar image is present", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["avatar-bytes"], "avatar.png", {
      type: "image/png",
    });
    await createSpace(client, {
      name: "My Space",
      avatarFile: {
        file,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    const [path, body] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/spaces");
    expect(body).toBeInstanceOf(FormData);

    const obj = formDataToObject(body as FormData);
    expect(obj.name).toBe("My Space");
    expect(obj.avatarFile).toBeInstanceOf(File);
    expect((obj.avatarFile as File).name).toBe("avatar.png");
    expect(obj["avatarFile.options"]).toBe(
      JSON.stringify({ mode: "original-aspect", sizes: { thumbnail: 200 } })
    );
    expect(obj).not.toHaveProperty("bannerFile");
  });

  it("createSpace sends multipart/FormData when a banner image is present", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["banner-bytes"], "banner.png", {
      type: "image/png",
    });
    await createSpace(client, {
      name: "My Space",
      bannerFile: {
        file,
        options: { mode: "original-aspect", sizes: { full: 1000 } },
      },
    });

    const [path, body] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/spaces");
    expect(body).toBeInstanceOf(FormData);

    const obj = formDataToObject(body as FormData);
    expect(obj.bannerFile).toBeInstanceOf(File);
    expect((obj.bannerFile as File).name).toBe("banner.png");
    expect(obj["bannerFile.options"]).toBe(
      JSON.stringify({ mode: "original-aspect", sizes: { full: 1000 } })
    );
    expect(obj).not.toHaveProperty("avatarFile");
  });

  it("createSpace sends both avatarFile and bannerFile together, with metadata JSON-stringified", async () => {
    const { client, projectInstance } = makeClient();
    const avatarFile = new File(["a"], "avatar.png", { type: "image/png" });
    const bannerFile = new File(["b"], "banner.png", { type: "image/png" });
    await createSpace(client, {
      name: "My Space",
      metadata: { category: "tech" },
      avatarFile: {
        file: avatarFile,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
      bannerFile: {
        file: bannerFile,
        options: { mode: "original-aspect", sizes: { full: 1000 } },
      },
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const obj = formDataToObject(body as FormData);
    expect((obj.avatarFile as File).name).toBe("avatar.png");
    expect((obj.bannerFile as File).name).toBe("banner.png");
    expect(obj.metadata).toBe(JSON.stringify({ category: "tech" }));
  });

  it("createSpace falls back to a generic filename when the avatar Blob has no name", async () => {
    const { client, projectInstance } = makeClient();
    const blob = new Blob(["raw-bytes"], { type: "image/png" });
    await createSpace(client, {
      name: "My Space",
      avatarFile: {
        file: blob,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const formData = body as FormData;
    const entries = formData.getAll("avatarFile");
    expect(entries).toHaveLength(1);
    expect((entries[0] as File).name).toBe("avatar");
  });

  it("fetchManySpaces gets /spaces with the full query as params", async () => {
    const { client, projectInstance } = makeClient();
    const query = { sortBy: "newest" as const, page: 1 };
    await fetchManySpaces(client, query);
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces", {
      params: query,
    });
  });

  it("fetchSpace strips spaceId into the path with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpace(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1");
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchSpaceByShortId gets /spaces/by-short-id with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceByShortId(client, { shortId: "sh1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/by-short-id", {
      params: { shortId: "sh1" },
    });
  });

  it("fetchSpaceBySlug gets /spaces/by-slug with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceBySlug(client, { slug: "my-space" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/by-slug", {
      params: { slug: "my-space" },
    });
  });

  it("checkSlugAvailability gets /spaces/check-slug with the full data as params", async () => {
    const { client, projectInstance } = makeClient();
    await checkSlugAvailability(client, { slug: "my-space" });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/check-slug", {
      params: { slug: "my-space" },
    });
  });

  it("fetchUserSpaces gets /spaces/user-spaces with the full data as params (no userId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchUserSpaces(client, { role: "admin", page: 1 });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/user-spaces", {
      params: { role: "admin", page: 1 },
    });
  });

  it("fetchChildSpaces strips spaceId into the path and passes the rest as params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchChildSpaces(client, { spaceId: "s1", page: 2, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith("/spaces/s1/children", {
      params: { page: 2, limit: 10 },
    });
  });

  it("fetchSpaceBreadcrumb hits the breadcrumb route with no params", async () => {
    const { client, projectInstance } = makeClient();
    await fetchSpaceBreadcrumb(client, { spaceId: "s1" });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/spaces/s1/breadcrumb"
    );
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("fetchMutualSpaces puts the OTHER user's id in the path and the rest as params (no actingUserId — actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await fetchMutualSpaces(client, { userId: "target1", page: 1, limit: 10 });
    expect(projectInstance.get).toHaveBeenCalledWith(
      "/spaces/mutual/target1",
      { params: { page: 1, limit: 10 } }
    );
  });

  it("updateSpace strips spaceId into the path and patches the rest as JSON when there is no avatar/banner", async () => {
    const { client, projectInstance } = makeClient();
    await updateSpace(client, { spaceId: "s1", name: "New name" });
    expect(projectInstance.patch).toHaveBeenCalledWith("/spaces/s1", {
      name: "New name",
    });
    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).not.toBeInstanceOf(FormData);
  });

  it("updateSpace sends multipart/FormData with avatarFile + avatarFile.options when an avatar is attached", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["avatar-bytes"], "newavatar.png", {
      type: "image/png",
    });
    await updateSpace(client, {
      spaceId: "s1",
      name: "New name",
      avatarFile: {
        file,
        options: { mode: "original-aspect", sizes: { thumbnail: 200 } },
      },
    });

    const [path, body] = projectInstance.patch.mock.calls[0];
    expect(path).toBe("/spaces/s1");
    expect(body).toBeInstanceOf(FormData);

    const obj = formDataToObject(body as FormData);
    expect(obj.name).toBe("New name");
    expect(obj.avatarFile).toBeInstanceOf(File);
    expect((obj.avatarFile as File).name).toBe("newavatar.png");
    expect(obj["avatarFile.options"]).toBe(
      JSON.stringify({ mode: "original-aspect", sizes: { thumbnail: 200 } })
    );
  });

  it("updateSpace sends multipart/FormData with bannerFile + bannerFile.options when a banner is attached", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["banner-bytes"], "newbanner.png", {
      type: "image/png",
    });
    await updateSpace(client, {
      spaceId: "s1",
      bannerFile: {
        file,
        options: { mode: "original-aspect", sizes: { full: 1000 } },
      },
    });

    const [, body] = projectInstance.patch.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);

    const obj = formDataToObject(body as FormData);
    expect(obj.bannerFile).toBeInstanceOf(File);
    expect((obj.bannerFile as File).name).toBe("newbanner.png");
    expect(obj["bannerFile.options"]).toBe(
      JSON.stringify({ mode: "original-aspect", sizes: { full: 1000 } })
    );
  });

  it("deleteSpace deletes /spaces/:spaceId", async () => {
    const { client, projectInstance } = makeClient();
    await deleteSpace(client, { spaceId: "s1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/spaces/s1");
  });
});

describe("js-sdk spaces (lifecycle) — response mapping", () => {
  it("createSpace returns the created Space (JSON path)", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", name: "My Space" };
    projectInstance.post.mockResolvedValueOnce({ data: space });

    const result = await createSpace(client, { name: "My Space" });

    expect(result).toEqual(space);
  });

  it("createSpace returns the created Space (multipart path)", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", name: "My Space", avatarFileId: "img1" };
    projectInstance.post.mockResolvedValueOnce({ data: space });
    const file = new File(["x"], "avatar.png", { type: "image/png" });

    const result = await createSpace(client, {
      name: "My Space",
      avatarFile: { file, options: { mode: "original-aspect", sizes: {} } },
    });

    expect(result).toEqual(space);
  });

  it("fetchManySpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "s1" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchManySpaces(client, {});

    expect(result).toEqual(envelope);
  });

  it("fetchSpace returns the SpaceDetailed", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", parentSpace: null, childSpaces: [] };
    projectInstance.get.mockResolvedValueOnce({ data: space });

    const result = await fetchSpace(client, { spaceId: "s1" });

    expect(result).toEqual(space);
  });

  it("fetchSpaceByShortId returns the SpaceDetailed", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", shortId: "sh1" };
    projectInstance.get.mockResolvedValueOnce({ data: space });

    const result = await fetchSpaceByShortId(client, { shortId: "sh1" });

    expect(result).toEqual(space);
  });

  it("fetchSpaceBySlug returns the SpaceDetailed", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", slug: "my-space" };
    projectInstance.get.mockResolvedValueOnce({ data: space });

    const result = await fetchSpaceBySlug(client, { slug: "my-space" });

    expect(result).toEqual(space);
  });

  it("checkSlugAvailability returns the availability wrapper", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.get.mockResolvedValueOnce({ data: { available: false } });

    const result = await checkSlugAvailability(client, { slug: "my-space" });

    expect(result).toEqual({ available: false });
  });

  it("fetchUserSpaces returns the full UserSpacesResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [
        {
          space: { id: "s1" },
          membership: {
            membershipId: "m1",
            role: "member",
            status: "active",
            joinedAt: "now",
          },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchUserSpaces(client, {});

    expect(result).toEqual(envelope);
  });

  it("fetchChildSpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "s2" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchChildSpaces(client, { spaceId: "s1" });

    expect(result).toEqual(envelope);
  });

  it("fetchSpaceBreadcrumb returns the SpaceBreadcrumb", async () => {
    const { client, projectInstance } = makeClient();
    const breadcrumb = {
      breadcrumb: [{ id: "s0", shortId: "sh0", name: "Root", slug: null, avatarFileId: null }],
      depth: 1,
    };
    projectInstance.get.mockResolvedValueOnce({ data: breadcrumb });

    const result = await fetchSpaceBreadcrumb(client, { spaceId: "s1" });

    expect(result).toEqual(breadcrumb);
  });

  it("fetchMutualSpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = {
      data: [{ id: "s3" }],
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: envelope });

    const result = await fetchMutualSpaces(client, { userId: "target1" });

    expect(result).toEqual(envelope);
  });

  it("updateSpace returns the updated Space (JSON path)", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", name: "New name" };
    projectInstance.patch.mockResolvedValueOnce({ data: space });

    const result = await updateSpace(client, {
      spaceId: "s1",
      name: "New name",
    });

    expect(result).toEqual(space);
  });

  it("updateSpace returns the updated Space (multipart path)", async () => {
    const { client, projectInstance } = makeClient();
    const space = { id: "s1", avatarFileId: "img2" };
    projectInstance.patch.mockResolvedValueOnce({ data: space });
    const file = new File(["x"], "newavatar.png", { type: "image/png" });

    const result = await updateSpace(client, {
      spaceId: "s1",
      avatarFile: { file, options: { mode: "original-aspect", sizes: {} } },
    });

    expect(result).toEqual(space);
  });

  it("deleteSpace returns the DeleteSpaceResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      message: "Space deleted",
      deletedSpace: { id: "s1", name: "My Space" },
      counts: { entities: 3, members: 5, childSpaces: 0 },
    };
    projectInstance.delete.mockResolvedValueOnce({ data: result });

    const response = await deleteSpace(client, { spaceId: "s1" });

    expect(response).toEqual(result);
  });
});
