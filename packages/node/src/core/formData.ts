/**
 * Shared `multipart/form-data` helpers for upload-bearing requests (storage
 * uploads, chat attachments). Content-Type is always left to axios so the
 * multipart boundary is set correctly — never hand-set it.
 */

/**
 * Wraps file bytes in a Blob so they can be appended to FormData. A Blob is
 * returned unchanged; a Uint8Array is wrapped with the given (or default) MIME type.
 */
export function toBlob(file: Uint8Array | Blob, mimeType?: string): Blob {
  // Cast needed because TypeScript's Blob constructor types are stricter than Node.js runtime allows
  return file instanceof Blob
    ? file
    : new Blob([file as unknown as BlobPart], {
        type: mimeType ?? "application/octet-stream",
      });
}

/** Appends file bytes under `field`, wrapping a Uint8Array in a Blob. */
export function appendFile(
  formData: FormData,
  field: string,
  file: Uint8Array | Blob,
  filename?: string,
  mimeType?: string
): void {
  formData.append(field, toBlob(file, mimeType), filename ?? "upload");
}

/**
 * Appends scalar/object fields to FormData. Objects and arrays are
 * JSON-stringified (the server parses them back); `undefined` values are skipped.
 */
export function appendFields(
  formData: FormData,
  fields: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    formData.append(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value)
    );
  }
}
