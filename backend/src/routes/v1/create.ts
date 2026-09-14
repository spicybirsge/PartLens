import express from "express"
const router = express.Router()
import verifySession from "../../middleware/verifySession.js"

router.post('/project', verifySession,async(req, res) => {

  
//soonTm
        
        
        return res.status(200).json({success: true, message: "Hello", code:200})

})


export default router