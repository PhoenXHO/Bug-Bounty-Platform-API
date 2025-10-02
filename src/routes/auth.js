import express from 'express';

import { register, login, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply strict rate limiting to authentication endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me); // Protect this route with the authenticate middleware

export default router;