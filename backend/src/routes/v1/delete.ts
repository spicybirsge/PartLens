import express from "express"
const router = express.Router()

router.delete('/example', async(req, res) => {



        return res.status(200).json({success: true, message: "Hello", code:200})

})


export default router