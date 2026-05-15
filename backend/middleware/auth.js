const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";

// WARNING: Set JWT_SECRET in your .env file for production!
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set in environment. Using default key — NOT SAFE for production!");
}

/**
 * Verifies Bearer token and sets req.userId. Does not send 401 so routes can use optional auth.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id;
      req.userRole = decoded.role;
    } catch (e) {
      // invalid token – leave req.userId unset
    }
  }
  next();
}

/**
 * Requires valid Bearer token. Sends 401 if missing or invalid.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Requires the authenticated user to have admin role.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

/**
 * Creates middleware that requires a specific role.
 * Must be used after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: `Access denied. Required role: ${roles.join(" or ")}` });
    }
    next();
  };
}

module.exports = { optionalAuth, requireAuth, requireAdmin, requireRole };
