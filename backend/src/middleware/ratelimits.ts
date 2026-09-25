import type { RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../redis/redisClient.js";

const redisPrefix = process.env.REDIS_PREFIX || "partlens";

const createRedisStore = (name: string) => new RedisStore({
    prefix: `${redisPrefix}:rate-limit:${name}:`,
    sendCommand: (...args) => redisClient.sendCommand(args),
});

const rateLimitHandler: RequestHandler = (_req, res) => res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
    data: null,
    code: 429,
});

const sharedOptions = {
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
    passOnStoreError: false,
    handler: rateLimitHandler,
};

export const authRateLimit = rateLimit({
    ...sharedOptions,
    windowMs: 15 * 60 * 1000,
    limit: 20,
    store: createRedisStore("auth"),
});

export const generalRateLimit = rateLimit({
    ...sharedOptions,
    windowMs: 60 * 1000,
    limit: 300,
    store: createRedisStore("general"),
});

export const uploadRateLimit = rateLimit({
    ...sharedOptions,
    windowMs: 60 * 60 * 1000,
    limit: 20,
    store: createRedisStore("upload"),
    keyGenerator: (req) => req.user
        ? `user:${req.user.id}`
        : req.ip
            ? `ip:${ipKeyGenerator(req.ip)}`
            : "ip:unknown",
});
