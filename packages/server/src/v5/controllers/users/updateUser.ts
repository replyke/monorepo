import { Request as ExReq, Response as ExRes } from "express";

import { User } from "../../../models";
import sanitizeUsername from "../../../helpers/sanitizeUsername";
import validateUserUpdated from "../../../helpers/webhooks/validateUserUpdated";
import IUser, { IUserAttributes } from "../../../interfaces/IUser";
import reduceAuthenticatedUserDetails from "../../../helpers/reduceAuthenticatedUserDetails";
import { Model, ModelStatic } from "sequelize";
import { ISuspension } from "../../../interfaces/ISuspension";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { update } = req.body;
    const { userId } = req.params;
    const projectId = req.project.id;

    // Validate the presence of required data.
    if (!userId || !update || Object.keys(update).length === 0) {
      res.status(400).json({
        error: "Missing required data",
        code: "user/missing-data",
      });
      return;
    }

    // Find the comment by projectId and commentId
    const user = await User.findOne({
      where: {
        id: userId,
        projectId,
      },
    });

    // If no user is found, return a 404 (Not Found) status.
    if (!user) {
      res.status(404).json({
        error: "User not found",
        code: "user/not-found",
      });
      return;
    }

    const {
      name,
      username,
      avatar,
      bio,
      birthdate,
      location,
      metadata,
      secureMetadata,
    } = update;

    const sanitizedUpdate: Partial<IUserAttributes> = {
      name,
      username,
      avatar,
      bio,
      birthdate,
      location,
      metadata,
      secureMetadata,
    };

    if (sanitizedUpdate.username) {
      sanitizedUpdate.username = sanitizeUsername(update.username);
    }

    if (sanitizedUpdate.location) {
      sanitizedUpdate.location = {
        type: "Point",
        coordinates: [update.location.longitude, update.location.latitude],
      };
    }

    // Call the webhook to validate the user creation
    await validateUserUpdated(req, res, update);

    // Update the user with the provided update content.
    await user.update(update);

    // get the target model for that alias:
    const SuspensionModel = (User.associations.suspensions as any)
      .target as ModelStatic<Model<any, any>>;

    const ActiveSuspensionModel = SuspensionModel.scope({
      method: ["active", new Date()],
    });

    // Reload the user to ensure the latest data is fetched.
    await user.reload({
      include: [
        {
          model: ActiveSuspensionModel,
          as: "suspensions",
          required: false,
        },
      ],
    });

    // Return the updated user.
    res
      .status(200)
      .json(
        reduceAuthenticatedUserDetails(
          user as unknown as IUser & { suspensions: ISuspension[] }
        )
      );
  } catch (err: any) {
    console.error("Error updating a user: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
