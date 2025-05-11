import { Router } from "express";
import {
  fetchUser,
  fetchUserSuggestions,
  fetchFollowersCount,
  fetchFollowingCount,
  checkUsernameAvailability,
  updateUser,
  fetchUserByForeignId,
  createFollow,
  deleteFollow,
  fetchFollow,
} from "../controllers/users";
import requireUserAuth from "../../middleware/requireUserAuth";

const router: Router = Router();

// Route to get user mentions suggestions
router.get("/suggestions", fetchUserSuggestions);

// Route to check if a username is available
router.get("/check-username", checkUsernameAvailability);

// Route to fetch a user by their foreignId
router.get("/by-foreign-id", fetchUserByForeignId);

// Route to fetch a user by id
router.get("/:userId", fetchUser);

// Route to get count of all followers of a user
router.get("/:userId/followers-count", fetchFollowersCount);

// Route to get count of all accounts a user follows
router.get("/:userId/following-count", fetchFollowingCount);

// Route for updating a user
router.patch("/:userId", requireUserAuth, updateUser);

//////// ** Follow routes ** ////////

// Route to follow a user
router.post("/:userId/follow", requireUserAuth, createFollow);

// Route to get a follow relationship
router.get("/:userId/follow", requireUserAuth, fetchFollow);

// Route to unfollow a user
router.delete("/:userId/follow", requireUserAuth, deleteFollow);

export default router;
