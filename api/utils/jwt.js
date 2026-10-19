import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mazhari_luxury_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a signed JWT token
 * @param {object} payload - Data to encode (e.g. { id, role, email })
 * @returns {string} Signed token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {object} Decoded payload
 */
export const verifyTokenUtil = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
