import { Router } from "express";
import requireUserAuth from "../../middleware/requireUserAuth";
import { createReport } from "../controllers/reports";

const router: Router = Router();

// Route to create a new report
router.post("/", requireUserAuth, createReport);

export default router;
