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

const rateLimitNotReady: RequestHandler = (_req, res) => res.status(503).json({
    success: false,
    message: "Service temporarily unavailable. Please try again shortly.",
    data: null,
    code: 503,
});

// The limiter instances can only be created once Redis is connected
// (`rate-limit-redis` loads its increment script during `store.init`, which
// runs synchronously inside `rateLimit()`), but they must NOT be created
// inside a request handler (`express-rate-limit` rejects that with
// `ERR_ERL_CREATED_IN_REQUEST_HANDLER`). So the instances are created by
// `initRateLimiters()` during startup — after `redisClient.connect()`, before
// `app.listen` — and these exported placeholders delegate to them.
let authLimiter: RequestHandler | undefined;
let generalLimiter: RequestHandler | undefined;
let uploadLimiter: RequestHandler | undefined;

const delegate = (getLimiter: () => RequestHandler | undefined): RequestHandler =>
    (req, res, next) => (getLimiter() ?? rateLimitNotReady)(req, res, next);

export const authRateLimit: RequestHandler = delegate(() => authLimiter);
export const generalRateLimit: RequestHandler = delegate(() => generalLimiter);
export const uploadRateLimit: RequestHandler = delegate(() => uploadLimiter);

export function initRateLimiters(): void {
    authLimiter ??= rateLimit({
        ...sharedOptions,
        windowMs: 15 * 60 * 1000,
        limit: 20,
        store: createRedisStore("auth"),
    });

    generalLimiter ??= rateLimit({
        ...sharedOptions,
        windowMs: 60 * 1000,
        limit: 300,
        store: createRedisStore("general"),
    });

    uploadLimiter ??= rateLimit({
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
}
