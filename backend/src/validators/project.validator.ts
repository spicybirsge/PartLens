//to whom it may concern this is project.validator.ts so any validations related to fetching projects or its related tables go in here.

import { body } from 'express-validator';

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
      if (!value.startsWith(base) || !value.endsWith('.glb')) {
        throw new Error('invalid file_url');
      }
      return true;
    })
    .bail()
    .custom(async (value) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(value, { method: 'HEAD', signal: controller.signal });
        if (!response.ok) {
          throw new Error('invalid file_url');
        }
        return true;
      } catch (err) {
        throw new Error('invalid file_url');
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
      if (!value.startsWith(base) || !value.endsWith('.glb')) {
        throw new Error('invalid file_url');
      }
      return true;
    })
    .bail()
    .custom(async (value) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(value, { method: 'HEAD', signal: controller.signal });
        if (!response.ok) {
          throw new Error('invalid file_url');
        }
        return true;
      } catch {
        throw new Error('invalid file_url');
      } finally {
        clearTimeout(timeout);
      }
    }),

  body('unlisted')
    .optional()
    .isBoolean().withMessage('unlisted must be a boolean'),
];