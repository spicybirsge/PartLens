//to whom it may concern this is project.validator.ts so any validations related to fetching projects or its related tables go in here.

import { body, query } from 'express-validator';

const allowedGlbMimeTypes = new Set([
  "model/gltf-binary",
  "application/octet-stream",
]);

export const createProjectValidator = [
  body('name')
    .isString().withMessage('name must be a string')
    .bail()
    .trim()
    .isLength({ min: 1 }).withMessage('name must not be empty')
    .bail()
    .isLength({ max: 255 }).withMessage('name must be at most 255 characters'),

  body('description')
    .optional({ values: 'null' })
    .isString().withMessage('description must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 }).withMessage('description must be at most 1000 characters'),

  body('file_url')
    .exists({ checkFalsy: true }).withMessage('file_url is required')
    .bail()
    .isString().withMessage('file_url must be a string')
    .bail()
    .isLength({ max: 2048 }).withMessage('file_url must be at most 2048 characters')
    .bail()
    .custom((value) => {
      const base = process.env.IMAGEKIT_URL_ENDPOINT;
      if (!base) {
        throw new Error('file_url could not be validated');
      }
      if (!value.startsWith(base) || !value.toLowerCase().endsWith('.glb')) {
        throw new Error('file_url must be a valid ImageKit GLB URL');
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

        if (!response.ok || !contentType || !allowedGlbMimeTypes.has(contentType)) {
          throw new Error('file_url must point to a valid GLB file');
        }
        return true;
      } catch {
        throw new Error('file_url must point to a reachable GLB file');
      } finally {
        clearTimeout(timeout);
      }
    }),

  body('unlisted')
    .isBoolean().withMessage('unlisted must be a boolean'),
];

export const updateProjectValidator = [
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
      throw new Error('at least one project field is required');
    }

    const allowedFields = ['name', 'description', 'file_url', 'unlisted'];
    if (Object.keys(value).some((field) => !allowedFields.includes(field))) {
      throw new Error('request contains an unsupported project field');
    }

    return true;
  }),

  body('name')
    .optional()
    .isString().withMessage('name must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('name must be between 1 and 255 characters'),

  body('description')
    .optional({ values: 'null' })
    .isString().withMessage('description must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 }).withMessage('description must be at most 1000 characters'),

  body('file_url')
    .optional()
    .isString().withMessage('file_url must be a string')
    .bail()
    .isLength({ max: 2048 }).withMessage('file_url must be at most 2048 characters')
    .bail()
    .custom((value) => {
      const base = process.env.IMAGEKIT_URL_ENDPOINT;
      if (!base) {
        throw new Error('file_url could not be validated');
      }
      if (!value.startsWith(base) || !value.toLowerCase().endsWith('.glb')) {
        throw new Error('file_url must be a valid ImageKit GLB URL');
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

        if (!response.ok || !contentType || !allowedGlbMimeTypes.has(contentType)) {
          throw new Error('file_url must point to a valid GLB file');
        }
        return true;
      } catch {
        throw new Error('file_url must point to a reachable GLB file');
      } finally {
        clearTimeout(timeout);
      }
    }),

  body('unlisted')
    .optional()
    .isBoolean().withMessage('unlisted must be a boolean'),
];

export const searchProjectsValidator = [
  query('q')
    .exists({ checkFalsy: true }).withMessage('q is required')
    .bail()
    .isString().withMessage('q must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('q must be between 1 and 200 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be an integer between 1 and 50'),

  query('cursor')
    .optional()
    .isInt({ min: 0 }).withMessage('cursor must be a non-negative integer offset'),
];

export const discoverProjectsValidator = [
  query('sort')
    .optional()
    .isString().withMessage('sort must be a string')
    .bail()
    .isIn(['top', 'newest']).withMessage("sort must be 'top' or 'newest'"),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be an integer between 1 and 50'),

  query('cursor')
    .optional()
    .isInt({ min: 0 }).withMessage('cursor must be a non-negative integer offset'),
];