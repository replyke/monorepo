import { Request as ExReq, Response as ExRes } from "express";
import jwt from "jsonwebtoken";

import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";
import { verifyPassword } from "../../../helpers/authentication";
import { Token } from "../../../models";
import IToken from "../../../interfaces/IToken";
import reduceAuthenticatedUserDetails from "../../../helpers/reduceAuthenticatedUserDetails";
import { getCoreConfig } from "../../../config";
import { Model, ModelStatic } from "sequelize";
import { ISuspension } from "../../../interfaces/ISuspension";

export default async (req: ExReq, res: ExRes) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: "Email, and password are required.",
      code: "auth/missing-fields",
    });
    return;
  }
  const project = req.project;
  const projectId = project.id;

  try {
    // get the target model for that alias:
    const SuspensionModel = (User.associations.suspensions as any)
      .target as ModelStatic<Model<any, any>>;

    const ActiveSuspensionModel = SuspensionModel.scope({
      method: ["active", new Date()],
    });
    // Find user by username using Sequelize
    const userWithSuspensions = (await User.findOne({
      where: { projectId, email },
      include: [
        {
          model: ActiveSuspensionModel,
          as: "suspensions",
          required: false,
        },
      ],
    })) as (IUser & { suspensions: ISuspension[] }) | null;

    if (!userWithSuspensions) {
      res.status(403).json({
        error: "User not found.",
        code: "auth/no-user-found",
      });
      return;
    }

    const { salt, hash } = userWithSuspensions;
    if (!salt || !hash) {
      res.status(403).json({
        error: "Invalid credentials.",
        code: "auth/invalid-credentials",
      });
      return;
    }

    // Validate password
    const isValid = verifyPassword(password, hash, salt);

    // If isn't valid
    if (!isValid) {
      res.status(401).json({
        error: "Incorrect password.",
        code: "auth/wrong-password",
      });
      return;
    }

    const { sequelize, refreshTokenSecret } = getCoreConfig();
    // Wrap the token generation and database save in a transaction
    const result = await sequelize.transaction(async (t) => {
      // Create an empty Token entry (UUID will be generated here)
      const refreshTokenEntry = (await Token.create(
        {
          userId: userWithSuspensions.id,
          projectId,
        },
        { transaction: t } // Ensure this is part of the transaction
      )) as IToken;

      // Generate the JWT for the refresh token
      const refreshTokenJWT = jwt.sign(
        {
          sub: userWithSuspensions.id, // Subject, representing the user ID
          projectId, // Project ID
          aud: "replyke.com", // Audience
          iss: "replyke.com", // Issuer
          jti: refreshTokenEntry.id, // Use the token ID as the JWT ID
        },
        refreshTokenSecret,
        { expiresIn: "30d" } // Refresh token expiry
      );

      // Update the Token with the generated JWT and save it
      refreshTokenEntry.refreshToken = refreshTokenJWT;
      await refreshTokenEntry.save({ transaction: t });

      // Generate the access token
      const accessTokenJWT = jwt.sign(
        {
          sub: userWithSuspensions.id, // Subject, representing the user ID
          projectId, // Project ID
          role: "user", // User role
          aud: "replyke.com", // Audience
          iss: "replyke.com", // Issuer
        },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "30m" } // Access token expiry
      );

      return { accessTokenJWT, refreshTokenJWT };
    });

    const { refreshTokenJWT, accessTokenJWT } = result;

    const reducedAuthenticatedUser =
      reduceAuthenticatedUserDetails(userWithSuspensions);

    res.cookie("replyke-refresh-jwt", refreshTokenJWT, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.status(200).json({
      success: true,
      accessToken: accessTokenJWT,
      refreshToken: refreshTokenJWT,
      user: reducedAuthenticatedUser,
    });
  } catch (err: any) {
    console.error("Error signing user in:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "auth/server-error",
      details: err.message,
    });
  }
};
