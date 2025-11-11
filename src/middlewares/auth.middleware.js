import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, JWT_SECRET);

      req.userId = decoded.userId;
      req.role = decoded.role;
      req.parentId = decoded.parentId;

      next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      return res
        .status(401)
        .json({ error: "Not authorized, token failed or expired." });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ error: "Not authorized, no token provided." });
  }
};

export const protectParent = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "changeme");

      req.userId = decoded.userId;
      req.role = decoded.role;

      if (req.params.parentId && req.params.parentId !== req.userId) {
        return res
          .status(403)
          .json({ error: "Access denied. Token mismatch with route ID." });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ error: "Not authorized, token failed." });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token." });
  }
};

export const protectChild = (req, res, next) => {
  if (!req.role) return protect(req, res, next);

  if (req.role !== "CHILD") {
    return res
      .status(403)
      .json({ error: "Access denied. Child role required." });
  }

  if (req.params.childId && req.params.childId !== req.userId.toString()) {
    return res
      .status(403)
      .json({ error: "Access denied. Token does not match route Child ID." });
  }

  next();
};
