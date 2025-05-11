import { Request as ExReq, Response as ExRes } from "express";
import { ForeignKeyConstraintError } from "sequelize";
import { Report } from "../../../models";
import { Comment } from "../../../models";
import { Entity } from "../../../models";
import IReport from "../../../interfaces/IReport";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { targetId, targetType, reason, details } = req.body;

    // Get the logged-in user's ID
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Validate required fields
    if (!targetId || !targetType || !reason) {
      res.status(400).json({
        error: "Missing required fields",
        code: "report/missing-data",
      });
      return;
    }

    // Ensure targetType is valid
    if (!["Comment", "Entity"].includes(targetType)) {
      res
        .status(400)
        .json({ error: "Invalid targetType", code: "report/invalid-type" });
      return;
    }

    // Validate the existence of the target
    let targetExists = false;
    if (targetType === "Comment") {
      targetExists = !!(await Comment.findByPk(targetId));
    } else if (targetType === "Entity") {
      targetExists = !!(await Entity.findByPk(targetId));
    }

    if (!targetExists) {
      res.status(404).json({
        error: `${targetType} not found`,
        code: "report/target-not-found",
      });
      return;
    }

    // Check if a report for this target already exists
    const existingReport = (await Report.findOne({
      where: { targetId, targetType },
    })) as IReport | null;

    if (existingReport) {
      // If the user already reported this target, do nothing
      const currentReporters = existingReport.reporters || [];
      if (currentReporters.includes(loggedInUserId)) {
        res.status(200).json({
          message: "Report already registered by this user",
          code: "report/already-reported",
        });
        return;
      }

      // Otherwise, add the user to the reporters array
      currentReporters.push(loggedInUserId);
      await existingReport.update({ reporters: currentReporters });

      res.status(200).json({
        message: "Report updated successfully",
        code: "report/updated",
      });
      return;
    } else {
      // Create a new report with this user's ID in reporters array
      await Report.create({
        projectId,
        targetId,
        targetType,
        reason,
        details,
        reporters: [loggedInUserId],
      });

      res.status(201).json({
        message: "Report submitted successfully",
        code: "report/created",
      });
      return;
    }
  } catch (err: any) {
    if (err instanceof ForeignKeyConstraintError) {
      res.status(400).json({
        error: "Invalid targetId or projectId",
        code: "report/invalid-foreign-key",
      });
      return;
    }
    console.error("Error creating a report: ", err);
    res.status(500).json({
      error: "Server error",
      code: "report/server-error",
      details: err.message,
    });
  }
};
