import { ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        code: 500
    });
};


export default errorHandler;