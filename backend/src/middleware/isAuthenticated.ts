import { RequestHandler } from "express"
import { database } from "../db/index.js"
import { usersTable, sessionTable } from "../db/schema.js"
import { eq } from "drizzle-orm"
import crypto from "crypto"

/**
 * Non-blocking session check.
 *
 * Validates the Authorization header exactly like verifySession, but never
 * sends an error response. Instead it sets:
 *
 *   req.isAuthenticated = false   when the header is missing/invalid, the
 *                                 session is missing or expired, or the
 *                                 lookup fails
 *   req.isAuthenticated = true    and populates req.user / req.session when
 *                                 a valid session exists
 *
 * When not authenticated, req.user and req.session remain undefined.
 */
const isAuthenticated: RequestHandler = async (req, res, next) => {
    req.isAuthenticated = false

    const authHeader = req.header("authorization");
    if (!authHeader) {
        return next();
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return next();
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    let [session] = await database.select().from(sessionTable).where(eq(sessionTable.tokenHash, tokenHash))

    if (!session) {
        return next();
    }

    if (session.expiresAt <= new Date()) {
        await database.delete(sessionTable).where(eq(sessionTable.tokenHash, tokenHash))
        return next();
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

    req.session = session;

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
    req.isAuthenticated = true;
    return next()
}

export default isAuthenticated;