import { body, query } from "express-validator";

const isOAuthState = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export const googleAuthValidator = [
  query("state")
    .custom(isOAuthState).withMessage("state must be a 64-character lowercase hexadecimal string"),
];

export const googleCallbackValidator = [
  query("code")
    .isString().withMessage("code must be a string")
    .bail()
    .notEmpty().withMessage("code is required"),
  query("state")
    .custom(isOAuthState).withMessage("state must be a 64-character lowercase hexadecimal string"),
];

export const obtainSessionValidator = [
  body("callback_code")
    .isString().withMessage("callback_code must be a string")
    .bail()
    .matches(/^[A-Za-z0-9_-]{43}$/).withMessage("callback_code must be a 43-character base64url string"),
  body("state")
    .custom(isOAuthState).withMessage("state must be a 64-character lowercase hexadecimal string"),
];
