import express from "express"
import { and, count, eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import { projectTable, projectViewsTable } from "../../db/schema.js";

const router = express.Router()

router.get('/project/:publicId', async (req, res) => {
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
                .select()
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

        const ip = req.ip || "unknown";
      

        const [viewCount] = await database
                .select({ views: count() })
                .from(projectViewsTable)
                .where(eq(projectViewsTable.projectId, project.id));

        res.status(200).json({
                success: true,
                message: "Project retrieved",
                data: { ...project, views: Number(viewCount.views) },
                code: 200,
        });


          await database
                .insert(projectViewsTable)
                .values({ projectId: project.id, ip, viewedAt: new Date() })
                .onConflictDoUpdate({
                        target: [projectViewsTable.projectId, projectViewsTable.ip],
                        set: { viewedAt: new Date() },
                });

                return;
});


export default router