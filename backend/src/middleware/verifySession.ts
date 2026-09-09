import { RequestHandler } from "express"
import { database } from "../db/index.js"
import { usersTable, sessionTable } from "../db/schema.js"
import { eq } from "drizzle-orm"
import crypto from "crypto"

const verifySession: RequestHandler = async (req, res, next) => {

    const authHeader = req.header("authorization");
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
            code: 401
        });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization header",
            code: 401
        })
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    let [session] = await database.select().from(sessionTable).where(eq(sessionTable.tokenHash, tokenHash))

    if (!session) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
            code: 401
        });
    }

    if (session.expiresAt <= new Date()) {
        await database.delete(sessionTable).where(eq(sessionTable.tokenHash, tokenHash))
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
            code: 401
        })
    }


    const fifteenMinutesAgo = new Date(Date.now() - 1000 * 60 * 15);
    const userAgent = req.header("user-agent") ?? "unknown"

    const ipChanged = session.ipAddress !== req.ip;
    const uaChanged = session.userAgent !== userAgent;
    const needsLastUsedUpdate = session.lastActive < fifteenMinutesAgo;

    if (ipChanged || uaChanged || needsLastUsedUpdate) {
        [session] = await database.update(sessionTable).set({
            ipAddress: req.ip,
            userAgent: userAgent,
            lastActive: new Date()
        }).where(eq(sessionTable.tokenHash, tokenHash)).returning()
    }

    const [user] = await database.select({
        id: usersTable.id,
        username: usersTable.username,
        name: usersTable.name,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt
    }).from(usersTable).where(eq(usersTable.id, session.userId))

    req.user = user;
    return next()

}

export default verifySession;