import { Request as ExReq, Response as ExRes } from "express";
import jwt from "jsonwebtoken";

import { generateSaltAndHash } from "../../../helpers/authentication";
import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";
import { Token } from "../../../models";
import IToken from "../../../interfaces/IToken";
import validateUserCreated from "../../../helpers/webhooks/validateUserCreated";
import ILocation from "../../../interfaces/ILocation";
import reduceAuthenticatedUserDetails from "../../../helpers/reduceAuthenticatedUserDetails";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  const {
    email,
    password,
    name,
    username,
    avatar,
    bio,
    location,
    birthdate,
    metadata,
    secureMetadata,
  } = req.body;
  const projectId = req.project.id!;
  const { sequelize, refreshTokenSecret } = getCoreConfig();

  // Validate required fields
  if (!email || !password) {
    res.status(400).json({
      error: "Missing required fields",
      code: "auth/missing-fields",
    });
    return;
  }

  try {
    // Generate salt and hash for the new password
    const { salt, hash } = generateSaltAndHash(password);

    const newUserData: Partial<IUser> & { projectId: string } = {
      projectId,
      role: "visitor",
      email: email.toLowerCase(),
      name,
      username: username.toLowerCase(),
      avatar,
      bio,
      location: location
        ? ({
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          } as ILocation)
        : undefined,
      birthdate,
      metadata,
      secureMetadata,
    };

    const { projectId: _, ...restOfUserData } = newUserData;

    // Call the webhook to validate the user creation
    await validateUserCreated(req, res, { projectId, data: restOfUserData });

    // Wrap the whole flow in a transaction to ensure consistency
    const result = await sequelize.transaction(async (t) => {
      // Create a new user
      const user = (await User.create(
        {
          ...newUserData,
          hash,
          salt,
        },
        { transaction: t } // Ensure this is part of the transaction
      )) as IUser;

      // Create an empty Token entry (UUID will be generated here)
      const refreshTokenEntry = (await Token.create(
        {
          userId: user.id,
          projectId,
        },
        { transaction: t } // Ensure this is part of the transaction
      )) as IToken;

      // Generate the JWT for the refresh token
      const refreshTokenJWT = jwt.sign(
        {
          sub: user.id, // Subject, representing the user ID
          projectId, // Project ID, indicating which project this token is tied to
          aud: "replyke.com", // Audience, your authentication service
          iss: "replyke.com", // Issuer, your service
          jti: refreshTokenEntry.id, // Use the token ID as the JWT ID
        },
        refreshTokenSecret,
        { expiresIn: "30d" } // Refresh token expires in 30 days
      );

      // Update the Token with the generated JWT and save it
      refreshTokenEntry.refreshToken = refreshTokenJWT;
      await refreshTokenEntry.save({ transaction: t }); // Ensure this is part of the transaction

      // Generate the JWT for the access token
      const accessTokenJWT = jwt.sign(
        {
          sub: user.id, // Subject, representing the user ID
          projectId, // Project ID, indicating which project this token is tied to
          role: "user", // User role
          aud: "replyke.com", // Audience, your authentication service
          iss: "replyke.com", // Issuer, your service
        },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "30m" } // Access token expiry
      );

      return { user, refreshTokenJWT, accessTokenJWT }; // Return both user and refreshToken if needed
    });

    // Access user and refreshToken from the transaction result if needed
    const { user, refreshTokenJWT, accessTokenJWT } = result;

    res.cookie("replyke-refresh-jwt", refreshTokenJWT, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const reducedAuthenticatedUser = reduceAuthenticatedUserDetails({
      ...user,
      suspensions: [],
    });

    res.status(201).json({
      success: true,
      accessToken: accessTokenJWT,
      refreshToken: refreshTokenJWT,
      user: reducedAuthenticatedUser,
    });
  } catch (err: any) {
    console.error("Error signing user up: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "auth/server-error",
      details: err.message,
    });
  }
};
