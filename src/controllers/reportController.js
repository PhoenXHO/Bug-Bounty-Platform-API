import { StatusCodes } from 'http-status-codes';

import prisma from '../utils/prisma.js';

/**
 * Creates a new bug report for a program.  
 * *Only authenticated RESEARCHERs can submit reports.*
 * @param {import('express').Request} req The request object with body containing `{ programId, title, description }` and `req.user` set by authentication middleware
 * @param {import('express').Response} res The response object
 */
async function createReport(req, res) {
	const { programId, title, description } = req.body;
	const researcherId = req.user.id;

	if (!programId || !title || !description) {
		return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Program ID, title, and description are required' });
	}

	try {
		// Verify the program exists
		const program = await prisma.program.findUnique({ where: { id: programId } });
		if (!program) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Program not found' });
		}

		const report = await prisma.report.create({
			data: {
				title,
				description,
				programId,
				researcherId,
			},
		});

		return res.status(StatusCodes.CREATED).json(report);
	} catch (error) {
		console.error('Failed to create report:', error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create report' });
	}
}

/**
 * Retrieves all reports for a specific program based on user role.  
 * *- **COMPANY** users see all reports for their own programs.*  
 * *- **RESEARCHER** users see only their own reports for a program.*
 * @param {import('express').Request} req The request object
 * @param {import('express').Response} res The response object
 */
async function getReportsForProgram(req, res) {
	const { programId } = req.params;
	const { id: userId, role } = req.user;

	try {
		const program = await prisma.program.findUnique({ where: { id: programId } });
		if (!program) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Program not found' });
		}

		let reports;
		if (role === 'COMPANY') {
			// A company can only view reports for its own programs
			if (program.companyId !== userId) {
				return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not authorized to view reports for this program' });
			}
			reports = await prisma.report.findMany({ where: { programId } });
		} else {
			// A researcher can only see their own reports for a program
			reports = await prisma.report.findMany({
				where: {
					programId,
					researcherId: userId,
				},
			});
		}

		return res.status(StatusCodes.OK).json(reports);
	} catch (error) {
		console.error('Failed to fetch reports:', error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch reports' });
	}
}

/**
 * Retrieves a single report by its ID.  
 * *Access is restricted to the **submitting RESEARCHER** or the **program-owning COMPANY**.*
 * @param {import('express').Request} req The request object with `req.params.id` and `req.user` set by authentication middleware
 * @param {import('express').Response} res The response object
 */
async function getReportById(req, res) {
	const { id } = req.params;
	const { id: userId, role } = req.user;

	try {
		const report = await prisma.report.findUnique({
			where: { id },
			include: { program: true }, // Include program to check for company ownership
		});

		if (!report) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Report not found' });
		}

		// Check permissions
		const isOwnerCompany = role === 'COMPANY' && report.program.companyId === userId;
		const isSubmittingResearcher = role === 'RESEARCHER' && report.researcherId === userId;

		if (!isOwnerCompany && !isSubmittingResearcher) {
			return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not authorized to view this report' });
		}

		return res.status(StatusCodes.OK).json(report);
	} catch (error) {
		console.error('Failed to fetch report:', error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch report' });
	}
}

/**
 * Updates the status or severity of a report.  
 * *Only the **COMPANY** that owns the program can perform this action.*
 * @param {import('express').Request} req The request object with `req.params.id`, body containing `{ status, severity }`, and `req.user` set by authentication middleware
 * @param {import('express').Response} res The response object
 */
async function updateReportStatus(req, res) {
	const { id } = req.params;
	const { status, severity } = req.body;
	const { id: userId } = req.user;

	if (!status && !severity) {
		return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Status or severity must be provided' });
	}

	try {
		const report = await prisma.report.findUnique({
			where: { id },
			include: { program: true },
		});

		if (!report) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Report not found' });
		}

		// Verify that the user is the company that owns the program
		if (report.program.companyId !== userId) {
			return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not authorized to update this report' });
		}

		const updatedReport = await prisma.report.update({
			where: { id },
			data: {
				...(status && { status }),
				...(severity && { severity }),
			},
		});

		return res.status(StatusCodes.OK).json(updatedReport);
	} catch (error) {
		console.error('Failed to update report:', error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update report' });
	}
}

export { createReport, getReportsForProgram, getReportById, updateReportStatus };
