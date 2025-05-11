import { Router } from "express";
import { upload } from "../../config/multer";
import { uploadFile } from "../controllers/storage";
import requireUserAuth from "../../middleware/requireUserAuth";

const router: Router = Router();

// Upload a new file
router.post("/", upload.single("file"), requireUserAuth, uploadFile);

export default router;
