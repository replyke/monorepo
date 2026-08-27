import { deleteFile, getFile, uploadFile, uploadImage } from "../src/modules/storage";
import { makeClient } from "./helpers/mockClient";

function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

describe("node-sdk storage — uploadFile request shaping", () => {
  it("posts multipart FormData to /storage with the file blob and JSON-stringified object fields", async () => {
    const { client, projectInstance } = makeClient();
    await uploadFile(client, {
      file: new Uint8Array([1, 2, 3]),
      filename: "avatar.png",
      mimeType: "image/png",
      pathParts: ["avatars", "u1"],
      position: 1,
      metadata: { source: "upload" },
      userId: "u1",
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    const [path, formData] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/storage");
    expect(formData).toBeInstanceOf(FormData);

    const fields = formDataToObject(formData as FormData);
    expect(fields.file).toBeInstanceOf(Blob);
    expect((fields.file as File).name).toBe("avatar.png");
    expect(fields.pathParts).toBe(JSON.stringify(["avatars", "u1"]));
    expect(fields.position).toBe("1");
    expect(fields.metadata).toBe(JSON.stringify({ source: "upload" }));
    expect(fields.userId).toBe("u1");
  });

  it("defaults the filename to 'upload' and skips undefined fields", async () => {
    const { client, projectInstance } = makeClient();
    await uploadFile(client, {
      file: new Uint8Array([1]),
      pathParts: ["files"],
    });

    const [, formData] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(formData as FormData);
    expect((fields.file as File).name).toBe("upload");
    expect(fields.pathParts).toBe(JSON.stringify(["files"]));
    expect(fields).not.toHaveProperty("userId");
    expect(fields).not.toHaveProperty("metadata");
  });
});

describe("node-sdk storage — uploadImage request shaping", () => {
  it("flattens exact-dimensions imageOptions as top-level multipart fields", async () => {
    const { client, projectInstance } = makeClient();
    await uploadImage(client, {
      file: new Uint8Array([1, 2, 3]),
      imageOptions: {
        mode: "exact-dimensions",
        dimensions: { thumbnail: { width: 100, height: 100 } },
        fit: "cover",
      },
      pathParts: ["spaces", "s1", "banner"],
      spaceId: "s1",
    });

    expect(projectInstance.post).toHaveBeenCalledTimes(1);
    const [path, formData] = projectInstance.post.mock.calls[0];
    expect(path).toBe("/storage/images");
    const fields = formDataToObject(formData as FormData);
    expect(fields.file).toBeInstanceOf(Blob);
    expect(fields.mode).toBe("exact-dimensions");
    expect(fields.dimensions).toBe(
      JSON.stringify({ thumbnail: { width: 100, height: 100 } }),
    );
    expect(fields.fit).toBe("cover");
    expect(fields.pathParts).toBe(JSON.stringify(["spaces", "s1", "banner"]));
    expect(fields.spaceId).toBe("s1");
  });

  it("flattens aspect-ratio-width-based imageOptions as top-level multipart fields", async () => {
    const { client, projectInstance } = makeClient();
    await uploadImage(client, {
      file: new Uint8Array([1, 2, 3]),
      imageOptions: {
        mode: "aspect-ratio-width-based",
        aspectRatio: { width: 16, height: 9 },
        widths: { hero: 1200 },
      },
      entityId: "e1",
    });

    const [, formData] = projectInstance.post.mock.calls[0];
    const fields = formDataToObject(formData as FormData);
    expect(fields.mode).toBe("aspect-ratio-width-based");
    expect(fields.aspectRatio).toBe(JSON.stringify({ width: 16, height: 9 }));
    expect(fields.widths).toBe(JSON.stringify({ hero: 1200 }));
    expect(fields.entityId).toBe("e1");
  });
});

describe("node-sdk storage — getFile/deleteFile request shaping", () => {
  it("getFile hits /storage/:fileId", async () => {
    const { client, projectInstance } = makeClient();
    await getFile(client, { fileId: "f1" });
    expect(projectInstance.get).toHaveBeenCalledWith("/storage/f1");
  });

  it("deleteFile deletes /storage/:fileId", async () => {
    const { client, projectInstance } = makeClient();
    await deleteFile(client, { fileId: "f1" });
    expect(projectInstance.delete).toHaveBeenCalledWith("/storage/f1");
  });
});

describe("node-sdk storage — response mapping", () => {
  it("uploadFile returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const file = { id: "f1", url: "https://cdn/avatar.png" };
    projectInstance.post.mockResolvedValueOnce({ data: file });
    await expect(
      uploadFile(client, { file: new Uint8Array([1]), pathParts: ["avatars"] }),
    ).resolves.toEqual(file);
  });

  it("uploadImage returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const file = { id: "f2", url: "https://cdn/banner.webp" };
    projectInstance.post.mockResolvedValueOnce({ data: file });
    await expect(
      uploadImage(client, {
        file: new Uint8Array([1]),
        imageOptions: { mode: "original-aspect", sizes: { full: 2000 } },
      }),
    ).resolves.toEqual(file);
  });

  it("getFile returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const file = { id: "f1", url: "https://cdn/avatar.png" };
    projectInstance.get.mockResolvedValueOnce({ data: file });
    await expect(getFile(client, { fileId: "f1" })).resolves.toEqual(file);
  });

  it("deleteFile resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(deleteFile(client, { fileId: "f1" })).resolves.toBeUndefined();
  });
});
