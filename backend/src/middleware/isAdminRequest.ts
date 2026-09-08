import { RequestHandler } from "express"
import crypto from "crypto"
const secret = process.env.ADMIN_KEY || "";

const isAdminRequest: RequestHandler = async (req, res, next) => {
    if (!secret || secret.length < 1) {
        req.isAdmin = false;
        return next()
    }
    const auth_header = req.header("authorization");
    if (!auth_header) {
        req.isAdmin = false;
        return next()
    }

    const key = auth_header.split(' ')[1];

    if (!key) {
        req.isAdmin = false;
        return next()
    }

    const keyBuffer = Buffer.from(key);
    const secretBuffer = Buffer.from(secret);

    if (keyBuffer.length !== secretBuffer.length) {
        req.isAdmin = false;
        return next()
    }


    req.isAdmin = crypto.timingSafeEqual(keyBuffer, secretBuffer);
    return next();



}

export default isAdminRequest;