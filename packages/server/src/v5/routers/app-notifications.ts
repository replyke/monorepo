import { Router } from "express";
import {
  fetchNotifications,
  countUnreadNotifications,
  markNotificationAsRead,
} from "../controllers/app-notifications";
import requireUserAuth from "../../middleware/requireUserAuth";
import { rateLimiter } from "../../utils/rateLimit";

const router: Router = Router();

// Fetch all logged in user's notifications
router.get("/", rateLimiter("5m", 30), requireUserAuth, fetchNotifications);

// Get count of all logged in user's unread notifications
router.get(
  "/count",
  rateLimiter("5m", 30),
  requireUserAuth,
  countUnreadNotifications
);

// Mark a notification as read
router.patch(
  "/:notificationId/mark-as-read",
  rateLimiter("5m", 50),
  requireUserAuth,
  markNotificationAsRead
);

export default router;
