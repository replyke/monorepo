import { Request as ExReq, Response as ExRes } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import IUser from "../../../interfaces/IUser";
import { User } from "../../../models";
import { Token } from "../../../models";
import IToken from "../../../interfaces/IToken";
import reduceAuthenticatedUserDetails from "../../../helpers/reduceAuthenticatedUserDetails";
import { getCoreConfig } from "../../../config";
import { Model, ModelStatic } from "sequelize";
import { ISuspension } from "../../../interfaces/ISuspension";

export default async (req: ExReq, res: ExRes) => {
  const { refreshToken } = req.body;
  const projectId = req.project.id;
  const cookies = req.cookies;
  const { refreshTokenSecret } = getCoreConfig();

  const refreshTokenJWT = cookies?.["replyke-refresh-jwt"] || refreshToken;
  if (!refreshTokenJWT) {
    res.status(200).json({
      user: null,
      accessToken: null,
    });
    return;
  }

  try {
    // Decode and verify the refresh token JWT
    const decoded = jwt.verify(
      refreshTokenJWT,
      refreshTokenSecret
    ) as JwtPayload;

    const { sub: userId, jti, projectId: decodedProjectId } = decoded;

    // Invalid token
    if (!userId || !jti || decodedProjectId !== projectId) {
      res.status(403).json({
        error: "Invalid refresh token.",
        code: "auth/invalid-refresh-token",
      });
      return;
    }

    // Find the refresh token in the Token table using the `jti`
    const storedToken = (await Token.findOne({
      where: { id: jti, userId, projectId },
    })) as IToken | null;

    // Token not found or mismatch
    if (!storedToken || storedToken.refreshToken !== refreshTokenJWT) {
      res.status(403).json({
        error: "Refresh token not recognized.",
        code: "auth/refresh-token-mismatch",
      });
      return;
    }

    // get the target model for that alias:
    const SuspensionModel = (User.associations.suspensions as any)
      .target as ModelStatic<Model<any, any>>;

    const ActiveSuspensionModel = SuspensionModel.scope({
      method: ["active", new Date()],
    });

    // Find user by ID
    const userWithSuspensions = (await User.findByPk(userId, {
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

    // Generate a new access token
    const accessTokenJWT = jwt.sign(
      {
        sub: userWithSuspensions.id, // Subject, representing the user ID
        projectId, // Project ID, indicating which project this token is tied to
        role: "user", // User role
        aud: "replyke.com", // Audience
        iss: "replyke.com", // Issuer
      },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "30m" } // Access token expires in 30 minutes
    );

    const reducedAuthenticatedUser =
      reduceAuthenticatedUserDetails(userWithSuspensions);

    // Send the new access token to the client
    res.status(200).json({
      success: true,
      accessToken: accessTokenJWT,
      user: reducedAuthenticatedUser,
    });

    userWithSuspensions.lastActive = new Date();
    userWithSuspensions.save();

    const { handlers } = getCoreConfig();
    await handlers.requestNewAccessToken({ projectId, userId });
  } catch (err: any) {
    console.error("Error verifying refresh token:", err);
    res.status(403).json({
      error: "Invalid or expired refresh token.",
      code: "auth/refresh-token-invalid",
      details: err.message,
    });
  }
};
