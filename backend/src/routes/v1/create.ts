import express from "express"
const router = express.Router()
import verifySession from "../../middleware/verifySession.js"
import { nanoid } from "nanoid"
import { validate } from '../../middleware/validate.js';
import { createProjectValidator } from "../../validators/project.validator.js";
import { createManualValidator, createPartManualValidator } from "../../validators/manual.validator.js";
import { partManualsTable, partsTable, projectTable } from "../../db/schema.js";
import { database } from "../../db/index.js";
import { and, eq } from "drizzle-orm";

router.post('/project', verifySession, validate(createProjectValidator), async (req, res) => {

        const { name, description, file_url, unlisted } = req.body;
        const userId = req.user?.id || "";


        const publicId = nanoid();

        const [project] = await database.insert(projectTable)
        .values({ 
                userId: userId,
                publicId: publicId,
                name: name,
                description: description,
                glbFileUrl: file_url,
                unlisted: unlisted

         }).returning()






        return res.status(200).json({ success: true, message: "project created", data:project, code: 200 })

})

router.post('/part', verifySession, validate(createManualValidator), async (req, res) => {
        const { public_id, name, part_number, description, file_urls } = req.body;

        const result = await database.transaction(async (tx) => {
                const [project] = await tx
                        .select({ id: projectTable.id, publicId: projectTable.publicId })
                        .from(projectTable)
                        .where(and(
                                eq(projectTable.publicId, public_id),
                                eq(projectTable.userId, req.user!.id),
                        ))
                        .limit(1);

                if (!project) {
                        return null;
                }

                const [existingPart] = await tx
                        .select()
                        .from(partsTable)
                        .where(and(
                                eq(partsTable.projectId, project.id),
                                eq(partsTable.partNumber, part_number),
                        ))
                        .limit(1);

                if (existingPart) {
                        return { conflict: true as const };
                }

                const [part] = await tx
                        .insert(partsTable)
                        .values({
                                projectId: project.id,
                                partNumber: part_number,
                                name,
                                description,
                        })
                        .returning();

                const manuals = file_urls.length === 0
                        ? []
                        : await tx
                                .insert(partManualsTable)
                                .values(file_urls.map(({ title, file_url }: { title: string; file_url: string }) => ({
                                        partId: part.id,
                                        title,
                                        fileUrl: file_url,
                                })))
                                .returning();

                return { project, part, manuals };
        });

        if (!result) {
                return res.status(404).json({
                        success: false,
                        message: "Project not found",
                        data: null,
                        code: 404,
                });
        }

        if ("conflict" in result) {
                return res.status(409).json({
                        success: false,
                        message: "A part with this part number already exists in the project",
                        data: null,
                        code: 409,
                });
        }

        return res.status(201).json({
                success: true,
                message: "Manual created successfully",
                data: result,
                code: 201,
        });
})

router.post('/manual', verifySession, validate(createPartManualValidator), async (req, res) => {
        const { part_id, title, file_url } = req.body;

        const [part] = await database
                .select({ id: partsTable.id })
                .from(partsTable)
                .innerJoin(projectTable, eq(partsTable.projectId, projectTable.id))
                .where(and(
                        eq(partsTable.id, part_id),
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

        const [manual] = await database
                .insert(partManualsTable)
                .values({
                        partId: part.id,
                        title,
                        fileUrl: file_url,
                })
                .returning();

        return res.status(201).json({
                success: true,
                message: "Manual created successfully",
                data: manual,
                code: 201,
        });
});


export default router;