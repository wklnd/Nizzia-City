const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'; // @TODO: require in production

// Attach req.authUserId if Authorization: Bearer <token> is present and valid.
function attachAuth(req, _res, next) {
  try {
    const auth = req.headers && req.headers.authorization;
    if (auth) {
      // Accept "Bearer <token>" with any case, and tolerate extra spacing.
      const bearerMatch = String(auth).match(/^Bearer\s+(.+)$/i);
      const token = bearerMatch ? bearerMatch[1].trim() : String(auth).trim();
      if (!token) return next();

      const payload = jwt.verify(token, JWT_SECRET);
      // Support current and legacy token payload shapes.
      const subject = payload?.sub ?? payload?.userId ?? payload?.id ?? payload?._id;
      if (subject) {
        req.authUserId = String(subject);
      }
    }
  } catch (_) {
    // ignore invalid token here; controllers can enforce
  }
  next();
}

// Reject with 401 when no valid token was provided.
function requireAuth(req, res, next) {
  if (!req.authUserId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

module.exports = { attachAuth, requireAuth };
