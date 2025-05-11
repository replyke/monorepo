import { Router } from "express";
import { rateLimiter } from "../../utils/rateLimit";
import { signTestingJwt } from "../controllers/crypto";

const router: Router = Router();

router.post("/sign-testing-jwt", rateLimiter("5m", 100), signTestingJwt);

export default router;
