const rateLimit = require('express-rate-limit');

// Applies to login, register, and forgot-password — the endpoints most worth
// protecting against brute-force guessing or automated abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window — generous for real users, tight for bots
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Applies to the public contact form — prevents spam submissions.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please wait a few minutes and try again.' },
});

module.exports = { authLimiter, contactLimiter };
