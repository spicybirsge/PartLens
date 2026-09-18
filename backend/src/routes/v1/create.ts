import express from "express"
const router = express.Router()
import verifySession from "../../middleware/verifySession.js"
import { nanoid } from "nanoid"
import { validate } from '../../middleware/validate.js';
import { createProjectValidator } from "../../validators/project.validator.js";
import { projectTable } from "../../db/schema.js";
import { database } from "../../db/index.js";

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


export default router