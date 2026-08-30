import { deleteFile, getFile, uploadFile, uploadImage } from "../src/modules/storage";
import { formDataToObject, makeClient } from "./helpers/client";

describe("js-sdk storage — uploadFile request shaping", () => {
  it("posts multipart FormData to /storage with the file blob and JSON-stringified object fields", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["avatar-bytes"], "avatar.png", {
      type: "image/png",
    });
    await uploadFile(client, {
      file,
      filename: "custom-name.png",
      pathParts: ["avatars", "u1"],
      position: 1,
      metadata: { source: "upload" },
      entityId: "e1",
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    const [path, body] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/storage");
    expect(body).toBeInstanceOf(FormData);

    const fields = formDataToObject(body as FormData);
    expect(fields.file).toBeInstanceOf(File);
    expect((fields.file as File).name).toBe("custom-name.png");
    expect(fields.pathParts).toBe(JSON.stringify(["avatars", "u1"]));
    expect(fields.position).toBe("1");
    expect(fields.metadata).toBe(JSON.stringify({ source: "upload" }));
    expect(fields.entityId).toBe("e1");
  });

  it("defaults the multipart filename to the File's own name when no explicit filename is given", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "original.png", { type: "image/png" });
    await uploadFile(client, { file, pathParts: ["files"] });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect((fields.file as File).name).toBe("original.png");
  });

  it("falls back to 'upload' as the filename when given a nameless Blob and no explicit filename", async () => {
    const { client, projectInstance } = makeClient();
    const blob = new Blob(["bytes"], { type: "image/png" });
    await uploadFile(client, { file: blob, pathParts: ["files"] });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect((fields.file as File).name).toBe("upload");
  });

  it("skips undefined optional fields (position/metadata/entityId/commentId/spaceId) entirely", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "f.png", { type: "image/png" });
    await uploadFile(client, { file, pathParts: ["files"] });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect(fields).not.toHaveProperty("position");
    expect(fields).not.toHaveProperty("metadata");
    expect(fields).not.toHaveProperty("entityId");
    expect(fields).not.toHaveProperty("commentId");
    expect(fields).not.toHaveProperty("spaceId");
    // pathParts (array) still present and JSON-stringified.
    expect(fields.pathParts).toBe(JSON.stringify(["files"]));
  });
});

describe("js-sdk storage — uploadImage request shaping", () => {
  it("flattens exact-dimensions imageOptions as top-level multipart fields (object dims JSON-stringified)", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "banner.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      imageOptions: {
        mode: "exact-dimensions",
        dimensions: { thumbnail: { width: 100, height: 100 } },
        fit: "cover",
      },
      pathParts: ["spaces", "s1", "banner"],
      spaceId: "s1",
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    const [path, body] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/storage/images");
    expect(body).toBeInstanceOf(FormData);

    const fields = formDataToObject(body as FormData);
    expect(fields.file).toBeInstanceOf(File);
    expect(fields.mode).toBe("exact-dimensions");
    expect(fields.dimensions).toBe(
      JSON.stringify({ thumbnail: { width: 100, height: 100 } })
    );
    expect(fields.fit).toBe("cover");
    expect(fields.pathParts).toBe(JSON.stringify(["spaces", "s1", "banner"]));
    expect(fields.spaceId).toBe("s1");
    // imageOptions itself is never sent as a nested field/object.
    expect(fields).not.toHaveProperty("imageOptions");
  });

  it("flattens aspect-ratio-width-based imageOptions as top-level multipart fields", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "hero.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      imageOptions: {
        mode: "aspect-ratio-width-based",
        aspectRatio: { width: 16, height: 9 },
        widths: { hero: 1200 },
      },
      entityId: "e1",
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect(fields.mode).toBe("aspect-ratio-width-based");
    expect(fields.aspectRatio).toBe(JSON.stringify({ width: 16, height: 9 }));
    expect(fields.widths).toBe(JSON.stringify({ hero: 1200 }));
    expect(fields.entityId).toBe("e1");
  });

  it("flattens aspect-ratio-height-based imageOptions as top-level multipart fields", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "hero.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      imageOptions: {
        mode: "aspect-ratio-height-based",
        aspectRatio: { width: 4, height: 3 },
        heights: { card: 400 },
      },
      commentId: "c1",
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect(fields.mode).toBe("aspect-ratio-height-based");
    expect(fields.aspectRatio).toBe(JSON.stringify({ width: 4, height: 3 }));
    expect(fields.heights).toBe(JSON.stringify({ card: 400 }));
    expect(fields.commentId).toBe("c1");
  });

  it("flattens original-aspect imageOptions as top-level multipart fields", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "avatar.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      imageOptions: {
        mode: "original-aspect",
        sizes: { thumbnail: 200, full: 1000 },
        fit: "inside",
      },
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect(fields.mode).toBe("original-aspect");
    expect(fields.sizes).toBe(JSON.stringify({ thumbnail: 200, full: 1000 }));
    expect(fields.fit).toBe("inside");
  });

  it("flattens multi-aspect-ratio imageOptions as top-level multipart fields", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "gallery.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      imageOptions: {
        mode: "multi-aspect-ratio",
        aspectRatios: [
          { width: 16, height: 9 },
          { width: 1, height: 1 },
        ],
        sizes: { hero: 1200 },
      },
      eventId: "ev1",
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect(fields.mode).toBe("multi-aspect-ratio");
    expect(fields.aspectRatios).toBe(
      JSON.stringify([
        { width: 16, height: 9 },
        { width: 1, height: 1 },
      ])
    );
    expect(fields.sizes).toBe(JSON.stringify({ hero: 1200 }));
    expect(fields.eventId).toBe("ev1");
  });

  it("uses the explicit filename over the File's own name when both are given", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "original.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      filename: "renamed.png",
      imageOptions: { mode: "original-aspect", sizes: { full: 1000 } },
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect((fields.file as File).name).toBe("renamed.png");
  });

  it("skips undefined optional association/path fields", async () => {
    const { client, projectInstance } = makeClient();
    const file = new File(["bytes"], "x.png", { type: "image/png" });
    await uploadImage(client, {
      file,
      imageOptions: { mode: "original-aspect", sizes: {} },
    });

    const [, body] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(body as FormData);
    expect(fields).not.toHaveProperty("pathParts");
    expect(fields).not.toHaveProperty("entityId");
    expect(fields).not.toHaveProperty("commentId");
    expect(fields).not.toHaveProperty("spaceId");
    expect(fields).not.toHaveProperty("eventId");
  });
});

describe("js-sdk storage — getFile/deleteFile request shaping", () => {
  it("getFile gets /storage/:fileId with no params", async () => {
    const { client, projectInstance } = makeClient();
    await getFile(client, { fileId: "f1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/storage/f1");
    expect(projectInstance.get.mock.calls[0]).toHaveLength(1);
  });

  it("deleteFile deletes /storage/:fileId with no body/params", async () => {
    const { client, projectInstance } = makeClient();
    await deleteFile(client, { fileId: "f1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/storage/f1");
    expect(projectInstance.delete.mock.calls[0]).toHaveLength(1);
  });
});

describe("js-sdk storage — response mapping", () => {
  it("uploadFile returns the UploadFileResponse", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      fileId: "f1",
      type: "file",
      relativePath: "avatars/u1/f1.png",
      publicPath: "https://cdn.example.com/avatars/u1/f1.png",
      size: 1234,
      mimeType: "image/png",
      createdAt: "2026-06-01T00:00:00Z",
    };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    const file = new File(["bytes"], "f.png", { type: "image/png" });

    const response = await uploadFile(client, {
      file,
      pathParts: ["avatars"],
    });

    expect(response).toEqual(result);
  });

  it("uploadImage returns the UploadImageResponse with variants", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      fileId: "f2",
      type: "image" as const,
      originalPath: "spaces/s1/banner/orig.png",
      originalSize: 5000,
      originalWidth: 2000,
      originalHeight: 1000,
      variants: {
        full: {
          path: "spaces/s1/banner/full.webp",
          width: 1000,
          height: 500,
          size: 2000,
          format: "webp",
          publicPath: "https://cdn.example.com/spaces/s1/banner/full.webp",
        },
      },
      format: "webp",
      quality: 80,
      createdAt: "2026-06-01T00:00:00Z",
    };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    const file = new File(["bytes"], "banner.png", { type: "image/png" });

    const response = await uploadImage(client, {
      file,
      imageOptions: { mode: "original-aspect", sizes: { full: 1000 } },
    });

    expect(response).toEqual(result);
  });

  it("getFile returns the GetFileResponse, including the image projection when present", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      fileId: "f1",
      type: "image",
      originalPath: "avatars/u1/orig.png",
      originalSize: 4096,
      originalMimeType: "image/png",
      position: null,
      metadata: null,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
      userId: "u1",
      image: {
        originalWidth: 800,
        originalHeight: 600,
        variants: {},
        processingStatus: "completed" as const,
        format: "webp",
        quality: 80,
        exifStripped: true,
      },
    };
    projectInstance.get.mockResolvedValueOnce({ data: result });

    const response = await getFile(client, { fileId: "f1" });

    expect(response).toEqual(result);
  });

  it("deleteFile resolves to undefined (void)", async () => {
    const { client, projectInstance } = makeClient();
    projectInstance.delete.mockResolvedValueOnce({ data: undefined });

    const response = await deleteFile(client, { fileId: "f1" });

    expect(response).toBeUndefined();
  });
});
