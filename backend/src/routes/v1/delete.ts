import express from "express"
import verifySession from "../../middleware/verifySession.js";
import { validate } from "../../middleware/validate.js";
import { deleteManualValidator, deletePartValidator } from "../../validators/manual.validator.js";
import { deleteProjectBookmarkValidator, deletePartBookmarkValidator } from "../../validators/bookmark.validator.js";
import { database } from "../../db/index.js";
import { partManualsTable, partsTable, projectTable, projectBookmarksTable, partBookmarksTable } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const router = express.Router()

router.delete('/project/:publicId', verifySession, async (req, res) => {
  const { publicId } = req.params;
  if (typeof publicId !== "string") {
    return res.status(400).json({ success: false, message: "Invalid project identifier", code: 400 });
  }

  const [project] = await database.delete(projectTable)
    .where(and(
      eq(projectTable.publicId, publicId),
      eq(projectTable.userId, req.user!.id),
    ))
    .returning({ id: projectTable.id });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found", data: null, code: 404 });
  }

  return res.status(200).json({
    success: true,
    message: "Project deleted",
    data: { id: project.id },
    code: 200,
  });
});

router.delete('/part/:partId', verifySession, validate(deletePartValidator), async (req, res) => {
  const { partId } = req.params;
  if (typeof partId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid part identifier",
      data: null,
      code: 400,
    });
  }

  const [part] = await database
    .select({ id: partsTable.id })
    .from(partsTable)
    .innerJoin(projectTable, eq(partsTable.projectId, projectTable.id))
    .where(and(
      eq(partsTable.id, partId),
      eq(projectTable.userId, req.user!.id),
    ))
    .limit(1);

  if (!part) {
    return res.status(404).json({
      success: false,
      message: "Part not found",
      data: null,
      code: 404,
    });
  }

  const [deletedPart] = await database
    .delete(partsTable)
    .where(eq(partsTable.id, part.id))
    .returning({ id: partsTable.id });

  return res.status(200).json({
    success: true,
    message: "Part deleted",
    data: { id: deletedPart.id },
    code: 200,
  });
});

router.delete('/manual/:manualId', verifySession, validate(deleteManualValidator), async (req, res) => {
  const { manualId } = req.params;
  if (typeof manualId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid manual identifier",
      data: null,
      code: 400,
    });
  }

  const [manual] = await database
    .select({ id: partManualsTable.id })
    .from(partManualsTable)
    .innerJoin(partsTable, eq(partManualsTable.partId, partsTable.id))
    .innerJoin(projectTable, eq(partsTable.projectId, projectTable.id))
    .where(and(
      eq(partManualsTable.id, manualId),
      eq(projectTable.userId, req.user!.id),
    ))
    .limit(1);

  if (!manual) {
    return res.status(404).json({
      success: false,
      message: "Manual not found",
      data: null,
      code: 404,
    });
  }

  const [deletedManual] = await database
    .delete(partManualsTable)
    .where(eq(partManualsTable.id, manual.id))
    .returning({ id: partManualsTable.id });

  return res.status(200).json({
    success: true,
    message: "Manual deleted",
    data: { id: deletedManual.id },
    code: 200,
  });
});


router.delete('/bookmark/project/:publicId', verifySession, validate(deleteProjectBookmarkValidator), async (req, res) => {
  const { publicId } = req.params;
  if (typeof publicId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid project identifier",
      data: null,
      code: 400,
    });
  }

  const [project] = await database
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(eq(projectTable.publicId, publicId))
    .limit(1);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
      code: 404,
    });
  }

  const [deleted] = await database
    .delete(projectBookmarksTable)
    .where(and(
      eq(projectBookmarksTable.userId, req.user!.id),
      eq(projectBookmarksTable.projectId, project.id),
    ))
    .returning({ id: projectBookmarksTable.id });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Project bookmark not found",
      data: null,
      code: 404,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Project bookmark removed",
    data: { id: deleted.id },
    code: 200,
  });
});

router.delete('/bookmark/part/:partId', verifySession, validate(deletePartBookmarkValidator), async (req, res) => {
  const { partId } = req.params;
  if (typeof partId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid part identifier",
      data: null,
      code: 400,
    });
  }

  const [deleted] = await database
    .delete(partBookmarksTable)
    .where(and(
      eq(partBookmarksTable.userId, req.user!.id),
      eq(partBookmarksTable.partId, partId),
    ))
    .returning({ id: partBookmarksTable.id });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Part bookmark not found",
      data: null,
      code: 404,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Part bookmark removed",
    data: { id: deleted.id },
    code: 200,
  });
});


export default router