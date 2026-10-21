import jwt from 'jsonwebtoken';

export const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
};
export const generateToken = (payload) =>
  jwt.sign(payload, getJWTSecret(), {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
export const verifyTokenUtil = (token) =>
  jwt.verify(token, getJWTSecret(), { algorithms: ['HS256'] });
