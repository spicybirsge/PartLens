import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import multer, { MulterError } from "multer";
import path from "node:path";
import ImageKit, { toFile } from "@imagekit/nodejs";
import { nanoid } from "nanoid";
import verifySession from "../../middleware/verifySession.js";

const router = express.Router();
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 30_000;

type UploadKind = "glb" | "pdf" | "image";

const allowedExtensions: Record<UploadKind, Set<string>> = {
  glb: new Set([".glb"]),
  pdf: new Set([".pdf"]),
  image: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
};

const allowedMimeTypes: Record<UploadKind, Set<string>> = {
  glb: new Set(["model/gltf-binary", "application/octet-stream"]),
  pdf: new Set(["application/pdf"]),
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
};

// Applies a request timeout so a stuck upload (bad stream handling, slow
// client, etc.) can't hang a connection open indefinitely.
const withUploadTimeout: RequestHandler = (req, res, next) => {
  req.setTimeout(UPLOAD_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Upload timed out",
        code: 408,
      });
    }
    req.destroy();
  });
  next();
};

const createUploadMiddleware = (kind: UploadKind) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isValid = allowedExtensions[kind].has(extension) && allowedMimeTypes[kind].has(file.mimetype);

    if (!isValid) {
      callback(null, false);
      return;
    }
    callback(null, true);
  },
}).single("file");

const uploadToImageKit = (kind: UploadKind): RequestHandler => async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "A valid file is required in the file field",
      code: 400,
    });
  }

  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
      console.error("IMAGEKIT_PRIVATE_KEY is not configured");
      return res.status(500).json({
        success: false,
        message: "File upload is not configured",
        code: 500,
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${nanoid()}${extension}`;
    const imageKit = new ImageKit({ privateKey });
    const uploadedFile = await imageKit.files.upload({
      file: await toFile(req.file.buffer, fileName),
      fileName,
      folder: `/partlens/${kind}`,
    });

    return res.status(200).json({
      success: true,
      message: `${kind.toUpperCase()} file uploaded successfully`,
      data: { url: uploadedFile.url, fileId: uploadedFile.fileId },
      code: 200,
    });
  } catch (error) {
    console.error("ImageKit upload failed:", error);
    return res.status(502).json({
      success: false,
      message: "File upload failed",
      code: 502,
    });
  }
};

const handleUploadError: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof MulterError) {
    const isTooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? "File exceeds the 25 MB upload limit"
        : "Invalid file type. Upload the expected file type in the file field",
      code: isTooLarge ? 413 : 400,
    });
  }
  return next(error);
};

router.post("/glb", verifySession, withUploadTimeout, createUploadMiddleware("glb"), handleUploadError, uploadToImageKit("glb"));
router.post("/pdf", verifySession, withUploadTimeout, createUploadMiddleware("pdf"), handleUploadError, uploadToImageKit("pdf"));
router.post("/image", verifySession, withUploadTimeout, createUploadMiddleware("image"), handleUploadError, uploadToImageKit("image"));

export default router;