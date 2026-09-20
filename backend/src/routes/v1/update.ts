import express from "express"
import verifySession from "../../middleware/verifySession.js";
import { validate } from "../../middleware/validate.js";
import { updateProjectValidator } from "../../validators/project.validator.js";
import { updatePartValidator } from "../../validators/manual.validator.js";
import { database } from "../../db/index.js";
import { partsTable, projectTable } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const router = express.Router()

router.patch('/project/:publicId', verifySession, validate(updateProjectValidator), async (req, res) => {
  const { publicId } = req.params;
  if (typeof publicId !== "string") {
    return res.status(400).json({ success: false, message: "Invalid project identifier", data: null, code: 400 });
  }

  const { name, description, file_url, unlisted } = req.body;
  const values: Partial<typeof projectTable.$inferInsert> = {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(file_url !== undefined && { glbFileUrl: file_url }),
    ...(unlisted !== undefined && { unlisted }),
    updatedAt: new Date(),
  };

  const [project] = await database.update(projectTable)
    .set(values)
    .where(and(
      eq(projectTable.publicId, publicId),
      eq(projectTable.userId, req.user!.id),
    ))
    .returning();

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found", data: null, code: 404 });
  }

  return res.status(200).json({ success: true, message: "Project updated", data: project, code: 200 });
});

router.patch('/manual/:partId', verifySession, validate(updatePartValidator), async (req, res) => {
  const { partId } = req.params;
  if (typeof partId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid part identifier",
      data: null,
      code: 400,
    });
  }

  const { part_number, name, description } = req.body;

  const [part] = await database
    .select({ id: partsTable.id, projectId: partsTable.projectId })
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

  if (part_number !== undefined) {
    const [duplicate] = await database
      .select({ id: partsTable.id })
      .from(partsTable)
      .where(and(
        eq(partsTable.projectId, part.projectId),
        eq(partsTable.partNumber, part_number),
      ))
      .limit(1);

    if (duplicate && duplicate.id !== part.id) {
      return res.status(409).json({
        success: false,
        message: "A part with this part number already exists in the project",
        data: null,
        code: 409,
      });
    }
  }

  const values: Partial<typeof partsTable.$inferInsert> = {
    ...(part_number !== undefined && { partNumber: part_number }),
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    updatedAt: new Date(),
  };

  const [updatedPart] = await database
    .update(partsTable)
    .set(values)
    .where(eq(partsTable.id, part.id))
    .returning();

  return res.status(200).json({
    success: true,
    message: "Part updated",
    data: updatedPart,
    code: 200,
  });
});


export default router;