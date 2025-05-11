import { Router } from "express";
import {
  signUp,
  signIn,
  signOut,
  changePassword,
  requestNewAccessToken,
  verifyExternalUser,
} from "../controllers/auth";
import { rateLimiter } from "../../utils/rateLimit";
import requireUserAuth from "../../middleware/requireUserAuth";

const router: Router = Router();

// Register a new user
router.post(
  "/sign-up",
  rateLimiter("5m", 5, "Too many sign up attempts, please wait 5 minutes"),
  signUp
);

// Sign a user in
router.post(
  "/sign-in",
  rateLimiter("5m", 5, "Too many sign in attempts, please wait 5 minutes"),
  signIn
);

// Log a user out
router.post(
  "/sign-out",
  rateLimiter("5m", 5, "Too many sign out attempts, please wait 5 minutes"),
  signOut
);

// Change a user password
router.post(
  "/change-password",
  rateLimiter(
    "5m",
    5,
    "Too many attempts to change password, please wait 5 minutes"
  ),
  requireUserAuth,
  changePassword
);

// Use refresh token to issue a new access token
router.post(
  "/request-new-access-token",
  rateLimiter(
    "5m",
    25,
    "Too many attempts to request a new access token, please wait 5 minutes"
  ),
  requestNewAccessToken
);

// Use refresh token to issue a new access token
router.post("/verify-external-user", rateLimiter("5m", 25), verifyExternalUser);

export default router;
