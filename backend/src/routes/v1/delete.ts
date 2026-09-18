import express from "express"
import verifySession from "../../middleware/verifySession.js";
import { database } from "../../db/index.js";
import { projectTable } from "../../db/schema.js";
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


export default router