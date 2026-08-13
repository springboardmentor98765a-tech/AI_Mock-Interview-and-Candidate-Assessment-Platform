import jwt from "jsonwebtoken";

// =========================
// Verify JWT Token
// =========================
export const verifyToken = (req, res, next) => {
    try {
        // Get Authorization Header
        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access Denied. Token Missing."
            });
        }

        // Extract Token
        const token = authHeader.split(" ")[1];

        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Store decoded user info
        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or Expired Token"
        });
    }
};

// =========================
// Role-Based Access Control
// =========================
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {

        // Check if user role is allowed
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access Forbidden. You do not have permission."
            });
        }

        next();
    };
};