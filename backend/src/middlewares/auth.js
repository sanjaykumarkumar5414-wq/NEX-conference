import jwt from "jsonwebtoken";

// JWT auth middleware; expects an Authorization: Bearer <token> header.
// The token payload is assumed to contain { id, role, email }.

export function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header."
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header.",
      code: "INVALID_TOKEN"
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw Object.assign(new Error("JWT secret not configured"), {
        status: 500,
        code: "ConfigError"
      });
    }

    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.id,
      dbUserId: payload.dbUserId || payload.id, // INT ID for database operations, fallback to string ID
      role: payload.role,
      email: payload.email
    };
    next();
  } catch (error) {
    const isExpired = error?.name === "TokenExpiredError";
    return res.status(401).json({
      error: "Unauthorized",
      message: isExpired
        ? "Token expired. Please sign in again."
        : "Invalid or expired token.",
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    });
  }
}

// Generic role-based guard:
// usage: router.get("/path", authenticateJwt, requireRole("ADMIN", "EMPLOYEE"), handler)
export function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this resource."
      });
    }
    next();
  };
}

// Convenience guards for specific roles
export function requireHrAdmin(req, res, next) {
  return requireRole("ADMIN")(req, res, next);
}

export function requireEmployee(req, res, next) {
  return requireRole("EMPLOYEE")(req, res, next);
}

