import express from "express"
import verifySession from "../../middleware/verifySession.js";
import { validate } from "../../middleware/validate.js";
import { updateProjectValidator } from "../../validators/project.validator.js";
import { database } from "../../db/index.js";
import { projectTable } from "../../db/schema.js";
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


export default router