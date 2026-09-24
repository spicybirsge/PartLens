import { body, param, query } from "express-validator";

export const createProjectBookmarkValidator = [
  body("public_id")
    .exists({ checkFalsy: true }).withMessage("public_id is required")
    .bail()
    .isString().withMessage("public_id must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 21 }).withMessage("public_id must be between 1 and 21 characters"),
];

export const createPartBookmarkValidator = [
  body("public_id")
    .exists({ checkFalsy: true }).withMessage("public_id is required")
    .bail()
    .isString().withMessage("public_id must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 21 }).withMessage("public_id must be between 1 and 21 characters"),

  body("part_id")
    .exists({ checkFalsy: true }).withMessage("part_id is required")
    .bail()
    .isUUID("all").withMessage("part_id must be a valid UUID"),
];

export const deleteProjectBookmarkValidator = [
  param("publicId")
    .isString().withMessage("publicId must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 21 }).withMessage("publicId must be between 1 and 21 characters"),
];

export const deletePartBookmarkValidator = [
  param("partId")
    .isUUID("all").withMessage("partId must be a valid UUID"),
];

export const listBookmarksValidator = [
  query("type")
    .exists({ checkFalsy: true }).withMessage("type is required")
    .bail()
    .isIn(["parts", "projects"]).withMessage("type must be 'parts' or 'projects'"),

  query("cursor")
    .optional()
    .isString().withMessage("cursor must be a string")
    .bail()
    .isUUID("all").withMessage("cursor must be a valid UUID"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("limit must be an integer between 1 and 50"),
];