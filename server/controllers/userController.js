import User from '../models/User.js';
import { publicUser, sessionFor } from './authController.js';
import * as v from '../utils/validation.js';
import { GOVERNORATES } from '../../shared/constants.js';
export const getProfile = async (req, res) =>
  res.json({ success: true, user: publicUser(req.user) });
export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.name = v.text(req.body.name, 'name', 100);
  user.mobile = v.phone(req.body.mobile);
  if (req.body.addresses !== undefined) {
    if (!Array.isArray(req.body.addresses) || req.body.addresses.length > 10)
      v.fail(400, 'Save up to ten addresses.');
    user.addresses = req.body.addresses.map((a, i) => {
      if (!GOVERNORATES.includes(a.governorate)) v.fail(400, 'Choose an Egyptian governorate.');
      return {
        street: v.text(a.street, 'street address', 300),
        city: v.text(a.city, 'city', 100),
        governorate: a.governorate,
        zip: v.text(a.zip || '', 'postal code', 20, false),
        isDefault: i === 0,
      };
    });
  }
  await user.save();
  res.json({ success: true, user: publicUser(user), message: 'Your details have been saved.' });
};
export const changePassword = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (
    typeof req.body.currentPassword !== 'string' ||
    !(await user.comparePassword(req.body.currentPassword))
  )
    v.fail(400, 'Current password is incorrect.');
  user.password = v.password(req.body.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({
    success: true,
    ...sessionFor(user),
    message: 'Password changed. Other sessions have been signed out.',
  });
};
export const softDeleteAccount = async (req, res) => {
  if (req.user.role === 'admin') v.fail(400, 'Administrator accounts cannot delete themselves.');
  const user = await User.findById(req.user._id);
  if (typeof req.body.password !== 'string' || !(await user.comparePassword(req.body.password)))
    v.fail(400, 'Your password is incorrect.');
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({
    success: true,
    message: 'Account deactivated. You can restore it with your existing credentials.',
  });
};
export const restoreAccount = async (req, res) => {
  const user = await User.findOne({ email: v.email(req.body.email) });
  if (
    !user ||
    typeof req.body.password !== 'string' ||
    !(await user.comparePassword(req.body.password)) ||
    user.isBanned
  )
    v.fail(401, 'Unable to restore this account with those credentials.');
  if (!user.isDeleted) v.fail(400, 'This account is already active. Please sign in.');
  user.isDeleted = false;
  user.deletedAt = null;
  await user.save();
  res.json({ success: true, ...sessionFor(user) });
};
