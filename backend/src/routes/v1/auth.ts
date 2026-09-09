import express from "express"
const router = express.Router()
import redisClient from "../../redis/redisClient.js"
import crypto from "crypto"
import { nanoid } from "nanoid"
import { database } from "../../db/index.js"
import { usersTable, sessionTable } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import verifySession from "../../middleware/verifySession.js"

router.get('/google', async (req, res) => {


        const state = crypto.randomBytes(32).toString("hex");
        await redisClient.set(`${process.env.REDIS_PREFIX}:auth:state:${state}`, "1", { EX: 600 })

        const params = new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                redirect_uri: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
                response_type: "code",
                scope: "openid email profile",
                state,
                prompt: "select_account",
        });


        res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);


})

router.get('/google/callback', async (req, res) => {
        const { code, state } = req.query;

        if (!code || !state) {
                return res.status(400).json({ success: false, message: "invalid request", code: 400 });
        }

        const stateKey = `${process.env.REDIS_PREFIX}:auth:state:${state}`;
        const exists = await redisClient.get(stateKey);

        if (!exists) {
                return res.status(400).json({ success: false, message: "invalid state", code: 400 });
        }

        await redisClient.del(stateKey);


        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                        code: code as string,
                        client_id: process.env.GOOGLE_CLIENT_ID!,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                        redirect_uri: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
                        grant_type: "authorization_code",
                }),
        });
        const tokens = await tokenRes.json();


        const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const profile = await profileRes.json();



        let [user] = await database.select().from(usersTable).where(eq(usersTable.googleId, profile.sub))

        if (!user) {
                [user] = await database.insert(usersTable).values({
                        googleId: profile.sub,
                        email: profile.email,
                        emailVerified: profile.email_verified,
                        name: profile.name,
                        avatarUrl: profile.picture,
                        username: nanoid(),
                }).returning();
        }

        const sessionToken = crypto.randomBytes(64).toString("base64url");
        const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
        const callbackToken = crypto.randomBytes(32).toString("base64url");

        const userAgent = req.header("user-agent") ?? "unknown";
        await database.insert(sessionTable).values({
                userId: user.id,
                tokenHash: tokenHash,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                ipAddress: req.ip,
                userAgent: userAgent
        })

        await redisClient.set(`${process.env.REDIS_PREFIX}:auth:callback:${callbackToken}`, sessionToken, { EX: 60 })
        return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?code=${callbackToken}`)
})


router.post("/obtain-session", async (req, res) => {
        const { callback_code } = req.body;

        if (!callback_code) {
                return res.status(400).json({ success: false, message: "invalid request", code: 400 })
        }

        let key = `${process.env.REDIS_PREFIX}:auth:callback:${callback_code}`
        let sessionToken = await redisClient.get(key)
        if (!sessionToken) {
                return res.status(400).json({ success: false, message: "invalid callback code", code: 400 })
        }
        await redisClient.del(key)

        return res.status(200).json({ success: true, message: "success", token: sessionToken, code: 200 })

})


router.get('/account', verifySession, async (req, res) => {
        return res.json({ success: true, message: "authentication success", user: req.user, code: 200 })
})



export default router