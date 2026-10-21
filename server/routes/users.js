import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  softDeleteAccount,
  restoreAccount,
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public restoration endpoint for returning deleted accounts
router.post('/restore', restoreAccount);

// Protected customer account endpoints
router.use(verifyToken);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.delete('/profile', softDeleteAccount);

export default router;
