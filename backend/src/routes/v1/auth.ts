import express from "express"
const router = express.Router()
import redisClient from "../../redis/redisClient.js"
import crypto from "crypto"
import { nanoid } from "nanoid"
import { database } from "../../db/index.js"
import { usersTable, sessionTable } from "../../db/schema.js"
import { and, eq, ne, lte } from "drizzle-orm"
import verifySession from "../../middleware/verifySession.js"
import { authRateLimit, generalRateLimit } from "../../middleware/ratelimits.js"
import { validate } from "../../middleware/validate.js"
import { googleAuthValidator, googleCallbackValidator, obtainSessionValidator } from "../../validators/auth.validator.js"

router.get('/google', authRateLimit, validate(googleAuthValidator), async (req, res) => {

        // The initiating tab keeps its own copy in sessionStorage.
        const state = String(req.query.state);
        const created = await redisClient.set(`${process.env.REDIS_PREFIX}:auth:state:${state}`, "1", { EX: 600, NX: true });
        if (!created) {
                return res.status(400).json({ success: false, message: "login already started; please try again", code: 400 });
        }

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

router.get('/google/callback', authRateLimit, validate(googleCallbackValidator), async (req, res) => {
        const code = String(req.query.code);
        const state = String(req.query.state);

        const stateKey = `${process.env.REDIS_PREFIX}:auth:state:${state}`;
        const exists = await redisClient.getDel(stateKey);

        if (!exists) {
                return res.status(400).json({ success: false, message: "invalid state", code: 400 });
        }

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                        code,
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

        // Both values must match to redeem the handoff, and a wrong state cannot consume it.
        await redisClient.set(`${process.env.REDIS_PREFIX}:auth:callback:${callbackToken}:${state}`, sessionToken, { EX: 60 })
        const callbackParams = new URLSearchParams({ code: callbackToken, state });
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Referrer-Policy", "no-referrer");
        return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${callbackParams}`)
})


router.post("/obtain-session", authRateLimit, validate(obtainSessionValidator), async (req, res) => {
        const { callback_code, state } = req.body;

        const key = `${process.env.REDIS_PREFIX}:auth:callback:${callback_code}:${state}`
        const sessionToken = await redisClient.getDel(key)
        if (!sessionToken) {
                return res.status(400).json({ success: false, message: "invalid callback code", code: 400 })
        }
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "success", token: sessionToken, code: 200 })

})


router.get('/me', generalRateLimit, verifySession, async (req, res) => {
        return res.json({ success: true, message: "authentication success", user: req.user, code: 200 })
})

router.post("/logout", authRateLimit, verifySession, async (req, res) => {
       await database.delete(sessionTable).where(eq(sessionTable.id, req.session!.id))

       return res.status(200).json({ success: true, message: "session terminated", code: 200 })
})

router.post("/logout-all", authRateLimit, verifySession, async (req, res) => {
       await database.delete(sessionTable).where(and(
               eq(sessionTable.userId, req.session!.userId),
               ne(sessionTable.id, req.session!.id)
       ))

       return res.status(200).json({ success: true, message: "other sessions terminated", code: 200 })
})

router.get("/sessions", generalRateLimit, verifySession, async (req, res) => {
       const now = new Date()

       await database.delete(sessionTable).where(and(
               eq(sessionTable.userId, req.session!.userId),
               lte(sessionTable.expiresAt, now)
       ))

       const sessions = await database.select({
               id: sessionTable.id,
               ipAddress: sessionTable.ipAddress,
               userAgent: sessionTable.userAgent,
               createdAt: sessionTable.createdAt,
               lastActive: sessionTable.lastActive,
               expiresAt: sessionTable.expiresAt
       }).from(sessionTable).where(eq(sessionTable.userId, req.session!.userId))

       return res.status(200).json({
               success: true,
               message: "active sessions retrieved",
               sessions: sessions.map((session) => ({
                       ...session,
                       current: session.id === req.session!.id
               })),
               code: 200
       })
})




export default router
