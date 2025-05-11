import { Router } from "express";

import {
  createNewList,
  fetchRootList,
  fetchSubLists,
  updateList,
  addEntityToList,
  removeEntityFromList,
  deleteList,
  isEntitySaved,
} from "../controllers/lists";
import requireUserAuth from "../../middleware/requireUserAuth";

const router: Router = Router();

// Route to create a new list
router.post("/:listId/sub-lists", requireUserAuth, createNewList);

// Route to fetch the root list for the logged in user
router.get("/root", requireUserAuth, fetchRootList);

// Route to fetch the sub-lists of a list
router.get("/:listId/sub-lists", requireUserAuth, fetchSubLists);

// Route to check if entity is saved by user
router.get("/is-entity-saved", requireUserAuth, isEntitySaved);

// Route add an entity to list
router.patch("/:listId/add-entity", requireUserAuth, addEntityToList);

// Route to remove an entity from list
router.patch("/:listId/remove-entity", requireUserAuth, removeEntityFromList);

// Route to update a list
router.patch("/:listId", requireUserAuth, updateList);

// Route to delete a list
router.delete("/:listId", requireUserAuth, deleteList);

export default router;
