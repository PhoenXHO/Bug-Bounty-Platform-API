import express from 'express';

import { authenticate, authorizeRole } from '../middleware/auth.js';
import { 
    createReport, 
    getReportsForProgram, 
    getReportById, 
    updateReportStatus 
} from '../controllers/reportController.js';

const router = express.Router();

// Create a new report (RESEARCHER only)
router.post('/', authenticate, authorizeRole(['RESEARCHER']), createReport);

// Get all reports for a program 
// (COMPANY can see all reports for their program, RESEARCHER can see only their own)
router.get('/program/:programId', authenticate, authorizeRole(['COMPANY', 'RESEARCHER']), getReportsForProgram);

// Get a specific report by ID
// (Available to the submitting RESEARCHER or the program-owning COMPANY)
router.get('/:id', authenticate, authorizeRole(['COMPANY', 'RESEARCHER']), getReportById);

// Update a report status (COMPANY only)
router.patch('/:id/status', authenticate, authorizeRole(['COMPANY']), updateReportStatus);

export default router;
