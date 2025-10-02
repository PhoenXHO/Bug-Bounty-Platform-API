import express from 'express';
import { createProgram, getPrograms, getProgramById, updateProgram, deleteProgram } from '../controllers/programController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { programLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// --- Public Routes ---
router.get('/', getPrograms);
router.get('/:id', getProgramById);

// --- Protected Routes ---
// Only authenticated users can access these routes

// Create a new program (only COMPANY users)
router.post('/', programLimiter, authenticate, authorizeRole(['COMPANY']), createProgram);

// Update a program (only COMPANY users who own the program)
router.put('/:id', authenticate, authorizeRole(['COMPANY']), updateProgram);

// Delete a program (only COMPANY users who own the program)
router.delete('/:id', authenticate, authorizeRole(['COMPANY']), deleteProgram);

export default router;
