import multer from "multer";

const storage = multer.memoryStorage(); // Store files in memory as Buffer
const limits = { fileSize: 100 * 1024 * 1024 }; // Limit file size to 100MB
// const fileFilter = (
//   _: ExReq,
//   file: Express.Multer.File,
//   cb: FileFilterCallback
// ) => {
//   const allowedMimeTypes = [
//     "image/jpeg",
//     "image/jpg",
//     "image/png",
//     "image/webp",
//     "application/pdf",
//   ];
//   if (!allowedMimeTypes.includes(file.mimetype)) {
//     console.error("Invalid file type: " + file.mimetype);
//     // Use a custom error message and pass `null` as the first argument if type error persists.
//     const error = new Error("Invalid file type");
//     cb(error as any, false); // TypeScript needs explicit casting here
//     return;
//   }
//   cb(null, true);
// };

export const upload = multer({
  storage,
  limits,
  // fileFilter,
});
