import mongoose from 'mongoose';
export const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
export const text = (value, name, max = 200, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()))
    fail(400, 'Please enter a valid ' + name + '.');
  return value.trim();
};
export const email = (value) => {
  const result = text(value, 'email address', 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(result)) fail(400, 'Enter a valid email address.');
  return result;
};
export const phone = (value) => {
  const result = text(value, 'mobile number', 25);
  if (!/^[+()\d\s-]{7,25}$/.test(result) || result.replace(/\D/g, '').length < 7)
    fail(400, 'Enter a valid mobile number.');
  return result;
};
export const password = (value) => {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72)
    fail(400, 'Passwords must be at least 8 characters and no more than 72 bytes.');
  return value;
};
export const objectId = (value) => {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) fail(404, 'Record not found.');
  return value;
};
export const amount = (value) => {
  const n = Number(value);
  if (
    !['string', 'number'].includes(typeof value) ||
    value === '' ||
    value === null ||
    !Number.isFinite(n) ||
    n < 0 ||
    n > 1000000
  )
    fail(400, 'Enter a valid non-negative amount.');
  return Math.round(n * 100) / 100;
};
export const quantity = (value) => {
  if (!Number.isInteger(value) || value < 1 || value > 50)
    fail(400, 'Quantity must be a whole number between 1 and 50.');
  return value;
};
export const pageParams = (query) => ({
  page: Math.max(1, Math.min(10000, Math.floor(Number(query.page)) || 1)),
  limit: Math.max(1, Math.min(100, Math.floor(Number(query.limit)) || 30)),
});
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
