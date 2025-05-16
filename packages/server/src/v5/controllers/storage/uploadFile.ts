import { Request as ExReq, Response as ExRes } from "express";
import { slugify } from "transliteration";
import { getCoreConfig } from "../../../config";

// Utility function to sanitize file names with transliteration
const sanitizeFileName = (name: string) => {
  const baseName = name.replace(/\.[^/.]+$/, ""); // Remove file extension
  const extension = name.split(".").pop(); // Extract file extension
  const transliteratedName = slugify(baseName); // Convert to Latin alphabet
  return `${transliteratedName}.${extension}`;
};

export default async (req: ExReq, res: ExRes) => {
  try {
    const pathParts = JSON.parse(req.body.pathParts);
    const projectId = req.project.id!;
    const file = req.file;
    const { handlers, createFile } = getCoreConfig();

    // Validate that pathParts is an array of strings
    if (
      !Array.isArray(pathParts) ||
      !pathParts.every((part) => typeof part === "string")
    ) {
      res.status(400).json({
        error: "pathParts must be an array of strings",
        code: "storage/invalid-path-parts",
      });
      return;
    }

    if (!file) {
      res.status(400).json({
        error: "No file provided",
        code: "storage/no-file",
      });
      return;
    }

    // Dynamically determine the file size limit
    const fileSizeLimit = 15 * 1024 * 1024; // 10mb

    // Validate file size
    if (file.size > fileSizeLimit) {
      res.status(413).json({
        error: `File size exceeds the allowed limit of ${
          fileSizeLimit / (1024 * 1024)
        }MB`,
        code: "storage/file-too-large",
      });
      return;
    }

    // Sanitize the file name to be Supabase-compatible
    const finalFileName = sanitizeFileName(file.originalname);
    const finalPathParts = pathParts.map((part) => slugify(part.trim()));

    // Append the file name to the path parts
    const completePathParts = [...finalPathParts, finalFileName];

    // Call createFile with the complete path and file buffer
    const { publicPath, path, id } = await createFile(
      projectId,
      completePathParts,
      file.buffer,
      file.mimetype
    );

    const relativePath = path;

    const fileId: string = id;

    handlers.uploadFile({ projectId, fileSize: file.size });

    // Return a success response
    res.status(201).json({
      fileId,
      relativePath,
      publicPath,
    });
  } catch (err: any) {
    console.error("Error uploading a file: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "storage/server-error",
      details: err.message,
    });
  }
};
