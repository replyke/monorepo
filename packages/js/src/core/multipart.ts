/**
 * Helpers for building `multipart/form-data` request bodies. Shared by every
 * upload site (storage, chat messages, user avatar/banner) so they encode
 * fields identically: object/array values are JSON-stringified (the server
 * re-parses them), scalars are coerced to strings, and `undefined` is skipped.
 *
 * Do NOT set the request's `Content-Type` manually for these bodies — axios sets
 * it to `undefined` for a `FormData` instance so the browser writes the
 * multipart boundary itself.
 */

/** Append a single field: skip `undefined`, JSON-stringify objects/arrays. */
export function appendField(form: FormData, key: string, value: unknown): void {
  if (value === undefined) return;
  form.append(
    key,
    typeof value === "object" ? JSON.stringify(value) : String(value)
  );
}

/** Append every own field of `fields` via {@link appendField}. */
export function appendFields(
  form: FormData,
  fields: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(fields)) {
    appendField(form, key, value);
  }
}

/**
 * Append a file part under `field`. The multipart filename is, in order of
 * precedence: an explicit `filename`, the `File`'s own name, then `fallback`.
 */
export function appendFile(
  form: FormData,
  field: string,
  file: Blob | File,
  opts?: { filename?: string; fallback?: string }
): void {
  const name =
    opts?.filename ??
    (file instanceof File && file.name ? file.name : undefined) ??
    opts?.fallback ??
    "upload";
  form.append(field, file, name);
}
