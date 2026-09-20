import { body, param } from "express-validator";

export const createManualValidator = [
  body("public_id")
    .exists({ checkFalsy: true }).withMessage("public_id is required")
    .bail()
    .isString().withMessage("public_id must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 21 }).withMessage("public_id must be between 1 and 21 characters"),

  body("name")
    .isString().withMessage("name must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage("name must be between 1 and 255 characters"),

  body("part_number")
    .isString().withMessage("part_number must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage("part_number must be between 1 and 255 characters"),

  body("description")
    .optional({ values: "null" })
    .isString().withMessage("description must be a string")
    .bail()
    .trim()
    .isLength({ max: 1000 }).withMessage("description must be at most 1000 characters"),

  body("file_urls")
    .isArray({ min: 1 }).withMessage("file_urls must contain at least one URL")
    .bail()
    .custom((values) => values.every((value: unknown) => (
      typeof value === "object"
      && value !== null
      && "title" in value
      && "file_url" in value
    )))
    .withMessage("file_urls must contain title and file_url objects"),

  body("file_urls.*.title")
    .isString().withMessage("title must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage("title must be between 1 and 255 characters"),

  body("file_urls.*.file_url")
    .isString().withMessage("file_url must be a string")
    .bail()
    .isLength({ max: 2048 }).withMessage("file_url must be at most 2048 characters")
    .bail()
    .custom((value) => {
      const base = process.env.IMAGEKIT_URL_ENDPOINT;
      if (!base) {
        throw new Error("file_url could not be validated");
      }
      if (!value.startsWith(base) || !value.toLowerCase().endsWith(".pdf")) {
        throw new Error("file_url must be a valid ImageKit PDF URL");
      }
      return true;
    })
    .bail()
    .custom(async (value) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(value, { method: "HEAD", signal: controller.signal });
        const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();

        if (!response.ok || contentType !== "application/pdf") {
          throw new Error("file_url must point to a valid PDF");
        }

        return true;
      } catch {
        throw new Error("file_url must point to a reachable PDF");
      } finally {
        clearTimeout(timeout);
      }
    }),
];

export const updatePartValidator = [
  param("partId")
    .isUUID("all").withMessage("partId must be a valid UUID"),

  body().custom((value) => {
    if (!value || typeof value !== "object" || Object.keys(value).length === 0) {
      throw new Error("at least one part field is required");
    }

    const allowedFields = ["part_number", "name", "description"];
    if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
      throw new Error("request contains an unsupported part field");
    }

    return true;
  }),

  body("part_number")
    .optional()
    .isString().withMessage("part_number must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage("part_number must be between 1 and 255 characters"),

  body("name")
    .optional()
    .isString().withMessage("name must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage("name must be between 1 and 255 characters"),

  body("description")
    .optional({ values: "null" })
    .isString().withMessage("description must be a string")
    .bail()
    .trim()
    .isLength({ max: 1000 }).withMessage("description must be at most 1000 characters"),
];
