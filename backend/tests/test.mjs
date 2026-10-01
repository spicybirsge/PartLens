import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as expressValidator from "express-validator";
import { customAlphabet } from "nanoid";

// Run from backend: node tests/test.mjs
// Exercise the actual route/component code with external services and browser APIs isolated.
function loadSource(path, imports, globals = {}) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const exports = {};
    vm.runInNewContext(outputText, {
        exports, URL, URLSearchParams, console, ...globals,
        require(name) {
            assert.ok(name in imports, `Unexpected import: ${name}`);
            return imports[name];
        },
    });
    return exports;
}

const state = "a".repeat(64);
const otherState = "b".repeat(64);

function backend({ newUser = false, collisions = 0 } = {}) {
    const routes = new Map();
    const entries = new Map();
    let now = 0;
    let googleRequests = 0;
    const generatedUsernames = [];
    const read = (key) => {
        const entry = entries.get(key);
        return entry && entry.expires > now ? entry.value : null;
    };
    const redis = {
        async set(key, value, options) {
            if (options.NX && read(key)) return null;
            entries.set(key, { value, expires: now + options.EX });
            return "OK";
        },
        async getDel(key) {
            const value = read(key);
            entries.delete(key);
            return value;
        },
    };
    const router = Object.fromEntries(["get", "post"].map((method) => [method,
        (path, ...handlers) => routes.set(`${method} ${path}`, handlers),
    ]));
    loadSource("../src/routes/v1/auth.ts", {
        express: { Router: () => router },
        "../../redis/redisClient.js": redis,
        crypto,
        "../../lib/generateUsername.js": loadSource("../src/lib/generateUsername.ts", { nanoid: { customAlphabet } }),
        "../../db/index.js": { database: {
            select: () => ({ from: () => ({ where: async () => newUser ? [] : [{ id: "user-id" }] }) }),
            insert: () => ({ values: (values) => {
                if (!values.username) return Promise.resolve();
                generatedUsernames.push(values.username);
                return { onConflictDoNothing: ({ target }) => {
                    assert.equal(target, "username-column");
                    return { returning: async () => generatedUsernames.length <= collisions ? [] : [{ id: "user-id" }] };
                } };
            } }),
        } },
        "../../db/schema.js": { usersTable: { username: "username-column" }, sessionTable: {} },
        "drizzle-orm": { and() {}, eq() {}, ne() {}, lte() {} },
        "../../middleware/verifySession.js": () => {},
        "../../middleware/ratelimits.js": {
            authRateLimit: (_req, _res, next) => next(),
            generalRateLimit: (_req, _res, next) => next(),
        },
        "../../middleware/validate.js": loadSource("../src/middleware/validate.ts", { "express-validator": expressValidator }),
        "../../validators/auth.validator.js": loadSource("../src/validators/auth.validator.ts", { "express-validator": expressValidator }),
    }, {
        process: { env: {
            REDIS_PREFIX: "test", BACKEND_URL: "https://api.example.com", FRONTEND_URL: "https://example.com",
            GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret",
        } },
        fetch: async () => {
            googleRequests++;
            return { json: async () => ({ access_token: "google-token", sub: "google-user" }) };
        },
    });
    return {
        advance(seconds) { now += seconds; },
        get googleRequests() { return googleRequests; },
        generatedUsernames,
        async request(route, data) {
            const res = {
                statusCode: 200, headers: {},
                status(code) { this.statusCode = code; return this; },
                json(body) { this.body = body; return this; },
                redirect(url) { this.url = new URL(url); return this; },
                setHeader(key, value) { this.headers[key] = value; },
            };
            const req = { query: data, body: data, header: () => "test", ip: "127.0.0.1" };
            for (const handler of routes.get(route)) {
                let continued = false;
                await handler(req, res, () => { continued = true; });
                if (!continued) break;
            }
            return res;
        },
    };
}

async function completeGoogle(app) {
    const start = await app.request("get /google", { state });
    assert.equal(start.url.searchParams.get("state"), state);
    assert.equal(start.url.searchParams.get("redirect_uri"), "https://api.example.com/api/v1/auth/google/callback");
    const callback = await app.request("get /google/callback", { code: "google-code", state });
    assert.equal(callback.url.searchParams.get("state"), state);
    return callback.url.searchParams.get("code");
}

test("signup retries occupied usernames and generates lowercase identifiers", async () => {
    const app = backend({ newUser: true, collisions: 2 });
    await completeGoogle(app);
    assert.equal(app.generatedUsernames.length, 3);
    for (const username of app.generatedUsernames) assert.match(username, /^[a-z0-9_-]{21}$/);
});

test("signup stops after repeated collisions without creating a session", async () => {
    const app = backend({ newUser: true, collisions: 10 });
    await assert.rejects(completeGoogle(app), /Unable to allocate a unique username/);
    assert.equal(app.generatedUsernames.length, 10);
});

test("username edits and profile queries normalize case", async () => {
    const validators = loadSource("../src/validators/user.validator.ts", { "express-validator": expressValidator });
    for (const [name, location] of [["updateUserValidator", "body"], ["getUserProfileValidator", "query"], ["getUserProjectsValidator", "query"]]) {
        const req = { body: {}, query: {} };
        req[location].username = "  ShaHeer  ";
        for (const validator of validators[name]) await validator.run(req);
        assert.ok(expressValidator.validationResult(req).isEmpty());
        assert.equal(req[location].username, "shaheer");
    }
});

test("username update database errors propagate while missing users return 404", async () => {
    for (const outcome of ["collision", "missing", "failure"]) {
        let handler;
        const pgError = Object.assign(new Error("unique violation"), { code: "23505", constraint: "users_username_unique" });
        const failure = new Error("database failure");
        const database = {
            select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
            update: () => ({ set: () => ({ where: () => ({ returning: async () => {
                if (outcome === "collision") throw new Error("Drizzle query failed", { cause: pgError });
                if (outcome === "failure") throw failure;
                return [];
            } }) }) }),
        };
        loadSource("../src/routes/v1/update.ts", {
            express: { Router: () => ({ patch(path, ...handlers) { if (path === "/user") handler = handlers.at(-1); } }) },
            "../../middleware/verifySession.js": () => {},
            "../../middleware/validate.js": { validate: () => () => {} },
            "../../validators/project.validator.js": {},
            "../../validators/manual.validator.js": {},
            "../../validators/user.validator.js": {},
            "../../db/index.js": { database },
            "../../db/schema.js": { usersTable: {}, partsTable: {}, projectTable: {} },
            "drizzle-orm": { and() {}, eq() {} },
        }, { Error });
        const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
        const request = () => handler({ body: { username: "shaheer" }, user: { id: "user-id" } }, res);
        if (outcome === "collision") await assert.rejects(request, /Drizzle query failed/);
        else if (outcome === "failure") await assert.rejects(request, failure);
        else {
            await request();
            assert.equal(res.code, 404);
        }
    }
});

test("rejects missing, malformed, array and object state before Google is contacted", async () => {
    const app = backend();
    for (const invalid of [undefined, "", "short", [state], { state }, "A".repeat(64)]) {
        const result = await app.request("get /google", { state: invalid });
        assert.equal(result.statusCode, 400);
        assert.equal(result.body.message, "invalid request body");
        assert.equal(result.body.errors[0].path, "state");
        assert.equal(result.body.errors[0].location, "query");
        assert.equal((await app.request("get /google/callback", { code: "code", state: invalid })).statusCode, 400);
    }
    assert.equal(app.googleRequests, 0);
});

test("auth middleware rejects invalid code fields before consuming valid state or handoffs", async () => {
    const app = backend();
    await app.request("get /google", { state });
    for (const code of [undefined, "", 123, ["google-code"], { code: "google-code" }]) {
        const result = await app.request("get /google/callback", { code, state });
        assert.equal(result.statusCode, 400);
        assert.equal(result.body.errors[0].path, "code");
    }
    assert.equal(app.googleRequests, 0);
    const callback = await app.request("get /google/callback", { code: "google-code", state });
    const callback_code = callback.url.searchParams.get("code");
    for (const invalid of [undefined, "", "short", [callback_code], { callback_code }]) {
        const result = await app.request("post /obtain-session", { callback_code: invalid, state });
        assert.equal(result.statusCode, 400);
        assert.equal(result.body.errors[0].path, "callback_code");
        assert.equal(result.body.errors[0].location, "body");
    }
    assert.equal((await app.request("post /obtain-session", { callback_code, state })).statusCode, 200);
});

test("unknown and expired states fail, and duplicate initiation does not refresh expiry", async () => {
    const app = backend();
    assert.equal((await app.request("get /google/callback", { code: "code", state })).statusCode, 400);
    await app.request("get /google", { state });
    app.advance(599);
    assert.equal((await app.request("get /google", { state })).statusCode, 400);
    app.advance(2);
    assert.equal((await app.request("get /google/callback", { code: "code", state })).statusCode, 400);
    assert.equal(app.googleRequests, 0);
});

test("simultaneous Google callbacks consume state only once", async () => {
    const app = backend();
    await app.request("get /google", { state });
    const results = await Promise.all([1, 2].map(() => app.request("get /google/callback", { code: "code", state })));
    assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 400]);
    assert.equal(app.googleRequests, 2); // One token request and one profile request.
});

test("session handoff requires matching state and can only be redeemed once", async () => {
    const app = backend();
    const callback_code = await completeGoogle(app);
    for (const invalid of [undefined, [state], otherState]) {
        assert.equal((await app.request("post /obtain-session", { callback_code, state: invalid })).statusCode, 400);
    }
    const results = await Promise.all([1, 2].map(() => app.request("post /obtain-session", { callback_code, state })));
    assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 400]);
    const success = results.find((res) => res.statusCode === 200);
    assert.match(success.body.token, /^[A-Za-z0-9_-]{86}$/);
    assert.equal(success.headers["Cache-Control"], "no-store");
});

test("expired handoff cannot return a session", async () => {
    const app = backend();
    const callback_code = await completeGoogle(app);
    app.advance(61);
    assert.equal((await app.request("post /obtain-session", { callback_code, state })).statusCode, 400);
});

function frontend({ expected = state, returned = state, code = "c".repeat(43), success = true } = {}) {
    const pending = new Map(expected ? [["oauth_state", expected]] : []);
    const tokens = new Map();
    const calls = [];
    const navigations = [];
    const effects = [];
    const notices = [];
    const params = new URLSearchParams();
    if (returned) params.set("state", returned);
    if (code) params.set("code", code);
    const storage = (map) => ({
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => map.set(key, value),
        removeItem: (key) => map.delete(key),
    });
    const window = {
        crypto: crypto.webcrypto,
        location: { href: `https://example.com/auth/callback?${params}`, assign: (url) => navigations.push(url) },
        sessionStorage: storage(pending), localStorage: storage(tokens),
        history: { replaceState: (_state, _title, url) => { window.location.href = `https://example.com${url}`; } },
    };
    const jsx = (type, props) => ({ type, props });
    const imports = {
        "react/jsx-runtime": { jsx, jsxs: jsx },
        react: { useEffect: (effect) => effects.push(effect), useRef: () => ({ current: false }), Suspense: "suspense" },
        "next/navigation": {
            useSearchParams: () => params,
            useRouter: () => ({ push: (url) => navigations.push(url), replace: (url) => navigations.push(url) }),
        },
        "@/components/ui/toast": { toast: { add: (notice) => notices.push(notice) } },
        "@/components/PageLoading": () => null,
        "@/vars/vars": { BACKEND_URL: "https://api.example.com" },
        "@/store/store": { userStore: () => ({ loaded: true, checkIfLoggedIn: async () => {} }) },
    };
    const globals = { window, fetch: async (_url, options) => {
        calls.push(JSON.parse(options.body));
        return { ok: success, json: async () => ({ success, token: "session-token" }) };
    } };
    return { pending, tokens, calls, navigations, notices, window, imports, globals, effects,
        async callback() {
            const { default: Page } = loadSource("../../frontend/src/app/auth/callback/page.tsx", imports, globals);
            Page().props.children.type();
            effects[0]();
            effects[0](); // React Strict Mode must not redeem the handoff twice.
            await new Promise((resolve) => setImmediate(resolve));
        },
    };
}

test("frontend rejects missing and mismatched state without requesting or storing a session", async () => {
    for (const options of [{ expected: null }, { returned: null }, { returned: otherState }, { code: null }]) {
        const app = frontend(options);
        await app.callback();
        assert.equal(app.calls.length, 0);
        assert.equal(app.tokens.size, 0);
        assert.deepEqual(app.navigations, ["/login"]);
        assert.equal(app.window.location.href, "https://example.com/auth/callback");
    }
});

test("matching frontend state is consumed, sent with the code and preserves localStorage login", async () => {
    const app = frontend();
    await app.callback();
    assert.deepEqual(app.calls, [{ callback_code: "c".repeat(43), state }]);
    assert.equal(app.pending.size, 0);
    assert.equal(app.tokens.get("token"), "session-token");
    assert.deepEqual(app.navigations, ["/"]);
});

test("rejected session exchange returns to login without storing a token", async () => {
    const app = frontend({ success: false });
    await app.callback();
    assert.equal(app.tokens.size, 0);
    assert.deepEqual(app.navigations, ["/login"]);
});

test("login button stores a fresh random state before navigating to the backend", () => {
    const app = frontend();
    Object.assign(app.imports, {
        "@/components/ui/card": { Card: "card", CardContent: "content", CardDescription: "description", CardHeader: "header", CardTitle: "title" },
        "@/components/ui/button": { Button: "button" },
        "../icons/flat-color-icons-google": "google-icon", "lucide-react": { ArrowLeft: "back-icon" },
        "next/link": "link", "../PageLoading": "loading", "../Navbar": "navbar",
    });
    const { default: Login } = loadSource("../../frontend/src/components/login/LoginPage.tsx", app.imports, app.globals);
    function findLogin(node) {
        if (!node || typeof node !== "object") return;
        if (node.type === "button" && node.props.variant === "outline") return node;
        return [node.props?.children].flat().map(findLogin).find(Boolean);
    }
    const button = findLogin(Login());
    button.props.onClick();
    const first = app.pending.get("oauth_state");
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.equal(new URL(app.navigations[0]).searchParams.get("state"), first);
    button.props.onClick();
    assert.notEqual(app.pending.get("oauth_state"), first);
    assert.equal(app.tokens.size, 0);
});
