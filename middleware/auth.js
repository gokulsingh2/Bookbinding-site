const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  const cookieName = process.env.COOKIE_NAME || 'bb_token';
  if (req.cookies && req.cookies[cookieName]) return req.cookies[cookieName];

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];

  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth, getTokenFromRequest };
