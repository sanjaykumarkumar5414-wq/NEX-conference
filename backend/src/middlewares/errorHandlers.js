// Generic 404 handler
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: "NotFound",
    message: "The requested resource was not found."
  });
  next();
}

// Centralized error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || "InternalServerError";

  // Log full error details for debugging, including stack and request info.
  // eslint-disable-next-line no-console
  console.error(
    `[Error] ${req.method} ${req.originalUrl} -> ${status} ${code}`,
    err.stack || err
  );

  res.status(status).json({
    error: code,
    message: err.message || "An unexpected error occurred."
  });
}

