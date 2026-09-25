import { body, query } from 'express-validator';

const allowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const updateUserValidator = [
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
      throw new Error('at least one user field is required');
    }

    const allowedFields = ['username', 'name', 'avatar_url'];
    if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
      throw new Error('request contains an unsupported user field');
    }

    return true;
  }),

  body('username')
    .optional()
    .isString().withMessage('username must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('username must be between 1 and 30 characters')
    .bail()
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('username must contain only letters, numbers, underscores, or hyphens'),

  body('name')
    .optional()
    .isString().withMessage('name must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 70 }).withMessage('name must be between 1 and 70 characters'),

  body('avatar_url')
    .optional({ values: 'null' })
    .isString().withMessage('avatar_url must be a string')
    .bail()
    .isLength({ max: 512 }).withMessage('avatar_url must be at most 512 characters')
    .bail()
    .custom((value) => {
      const base = process.env.IMAGEKIT_URL_ENDPOINT;
      if (!base) {
        throw new Error('avatar_url could not be validated');
      }
      const lower = value.toLowerCase();
      if (!value.startsWith(base) || !allowedImageExtensions.some((ext) => lower.endsWith(ext))) {
        throw new Error('avatar_url points to an invalid url');
      }
      return true;
    })
    .bail()
    .custom(async (value) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(value, { method: 'HEAD', signal: controller.signal });
        const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();

        if (!response.ok || !contentType || !allowedImageMimeTypes.has(contentType)) {
          throw new Error('avatar_url must point to a valid image');
        }

        return true;
      } catch {
        throw new Error('avatar_url must point to a reachable image');
      } finally {
        clearTimeout(timeout);
      }
    }),
];

export const getUserProfileValidator = [
  query('username')
    .exists({ checkFalsy: true }).withMessage('username is required')
    .bail()
    .isString().withMessage('username must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('username must be between 1 and 30 characters')
    .bail()
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('username must contain only letters, numbers, underscores, or hyphens'),
];

export const getUserProjectsValidator = [
  query('username')
    .exists({ checkFalsy: true }).withMessage('username is required')
    .bail()
    .isString().withMessage('username must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('username must be between 1 and 30 characters')
    .bail()
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('username must contain only letters, numbers, underscores, or hyphens'),

  query('cursor')
    .optional()
    .isString().withMessage('cursor must be a string')
    .bail()
    .isUUID('all').withMessage('cursor must be a valid UUID'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be an integer between 1 and 50'),
];
