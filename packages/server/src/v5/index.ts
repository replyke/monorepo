import { Router } from "express";
import {
  appNotificationsRouter,
  authRouter,
  commentsRouter,
  entitiesRouter,
  listsRouter,
  reportsRouter,
  storageRouter,
  usersRouter,
} from "./routers";

// Routes that require requireValidProject
const apiRouter: Router = Router();

apiRouter.use("/app-notifications", appNotificationsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/comments", commentsRouter);
apiRouter.use("/entities", entitiesRouter);
apiRouter.use("/lists", listsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/storage", storageRouter);

export default apiRouter;
