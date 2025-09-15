import { StatusCodes } from 'http-status-codes';

import { createReport, getReportsForProgram, getReportById, updateReportStatus } from '../../src/controllers/reportController.js';
import prisma from '../../src/utils/prisma.js';

// Mock dependencies
jest.mock('../../src/utils/prisma.js', () => ({
	program: {
		findUnique: jest.fn()
	},
	report: {
		create: jest.fn(),
		findMany: jest.fn(),
		findUnique: jest.fn(),
		update: jest.fn()
	}
}));

describe('Report Controller', () => {
	let req;
	let res;

	beforeEach(() => {
		req = {
			body: {},
			params: {},
			user: {
				id: 'researcher-123',
				role: 'RESEARCHER'
			}
		};

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis()
		};

		jest.clearAllMocks();
	});

	describe('createReport', () => {
		it('should return 400 if required fields are missing', async () => {
			// Call with empty body
			await createReport(req, res);

			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('required') });
		});

		it('should return 404 if program does not exist', async () => {
			// Setup
			req.body = {
				programId: 'nonexistent-program',
				title: 'Test Report',
				description: 'Test Description'
			};

			prisma.program.findUnique.mockResolvedValue(null);

			// Call the controller
			await createReport(req, res);

			// Assertions
			expect(prisma.program.findUnique).toHaveBeenCalledWith({
				where: { id: req.body.programId }
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
			expect(res.json).toHaveBeenCalledWith({ error: 'Program not found' });
		});

		it('should create a report successfully', async () => {
			// Setup
			req.body = {
				programId: 'program-123',
				title: 'Test Report',
				description: 'Test Description'
			};

			prisma.program.findUnique.mockResolvedValue({
				id: 'program-123',
				name: 'Test Program'
			});

			const createdReport = {
				id: 'report-123',
				...req.body,
				researcherId: req.user.id,
				status: 'OPEN',
				severity: null,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			prisma.report.create.mockResolvedValue(createdReport);

			// Call the controller
			await createReport(req, res);

			// Assertions
			expect(prisma.report.create).toHaveBeenCalledWith({
				data: {
					title: req.body.title,
					description: req.body.description,
					programId: req.body.programId,
					researcherId: req.user.id
				}
			});

			expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
			expect(res.json).toHaveBeenCalledWith(createdReport);
		});

		it('should handle server errors', async () => {
			// Setup
			req.body = {
				programId: 'program-123',
				title: 'Test Report',
				description: 'Test Description'
			};

			prisma.program.findUnique.mockResolvedValue({
				id: 'program-123',
				name: 'Test Program'
			});

			prisma.report.create.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await createReport(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create report' });
		});
	});

	describe('getReportsForProgram', () => {
		it('should return 404 if program does not exist', async () => {
			// Setup
			req.params = { programId: 'nonexistent-program' };

			prisma.program.findUnique.mockResolvedValue(null);

			// Call the controller
			await getReportsForProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
			expect(res.json).toHaveBeenCalledWith({ error: 'Program not found' });
		});

		it('should return reports for a company that owns the program', async () => {
			// Setup
			const companyId = 'company-123';
			req.user = { id: companyId, role: 'COMPANY' };
			req.params = { programId: 'program-123' };

			const program = {
				id: 'program-123',
				companyId
			};

			const reports = [
				{ id: 'report-1', programId: 'program-123', title: 'Report 1' },
				{ id: 'report-2', programId: 'program-123', title: 'Report 2' }
			];

			prisma.program.findUnique.mockResolvedValue(program);
			prisma.report.findMany.mockResolvedValue(reports);

			// Call the controller
			await getReportsForProgram(req, res);

			// Assertions
			expect(prisma.report.findMany).toHaveBeenCalledWith({
				where: { programId: req.params.programId }
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(reports);
		});

		it('should return 403 if company does not own the program', async () => {
			// Setup
			req.user = { id: 'company-456', role: 'COMPANY' };
			req.params = { programId: 'program-123' };

			const program = {
				id: 'program-123',
				companyId: 'company-789' // Different from req.user.id
			};

			prisma.program.findUnique.mockResolvedValue(program);

			// Call the controller
			await getReportsForProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('not authorized') });
		});

		it('should return only researcher\'s own reports for a program', async () => {
			// Setup
			const researcherId = 'researcher-123';
			req.user = { id: researcherId, role: 'RESEARCHER' };
			req.params = { programId: 'program-123' };

			const program = {
				id: 'program-123',
				companyId: 'company-789'
			};

			const reports = [
				{ id: 'report-1', programId: 'program-123', researcherId, title: 'Report 1' }
			];

			prisma.program.findUnique.mockResolvedValue(program);
			prisma.report.findMany.mockResolvedValue(reports);

			// Call the controller
			await getReportsForProgram(req, res);

			// Assertions
			expect(prisma.report.findMany).toHaveBeenCalledWith({
				where: {
					programId: req.params.programId,
					researcherId: req.user.id
				}
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(reports);
		});

		it('should handle server errors', async () => {
			// Setup
			req.params = { programId: 'program-123' };
			prisma.program.findUnique.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await getReportsForProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch reports' });
		});
	});

	describe('getReportById', () => {
		it('should return 404 if report does not exist', async () => {
			// Setup
			req.params = { id: 'nonexistent-report' };
			prisma.report.findUnique.mockResolvedValue(null);

			// Call the controller
			await getReportById(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
			expect(res.json).toHaveBeenCalledWith({ error: 'Report not found' });
		});

		it('should return report for submitting researcher', async () => {
			// Setup
			const researcherId = 'researcher-123';
			req.user = { id: researcherId, role: 'RESEARCHER' };
			req.params = { id: 'report-123' };

			const report = {
				id: 'report-123',
				title: 'Test Report',
				description: 'Test Description',
				researcherId,
				program: {
					id: 'program-123',
					companyId: 'company-789'
				}
			};

			prisma.report.findUnique.mockResolvedValue(report);

			// Call the controller
			await getReportById(req, res);

			// Assertions
			expect(prisma.report.findUnique).toHaveBeenCalledWith({
				where: { id: req.params.id },
				include: { program: true }
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(report);
		});

		it('should return report for program-owning company', async () => {
			// Setup
			const companyId = 'company-789';
			req.user = { id: companyId, role: 'COMPANY' };
			req.params = { id: 'report-123' };

			const report = {
				id: 'report-123',
				title: 'Test Report',
				description: 'Test Description',
				researcherId: 'researcher-123',
				program: {
					id: 'program-123',
					companyId // Same as req.user.id
				}
			};

			prisma.report.findUnique.mockResolvedValue(report);

			// Call the controller
			await getReportById(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(report);
		});

		it('should return 403 if user is not authorized to view the report', async () => {
			// Setup
			req.user = { id: 'researcher-456', role: 'RESEARCHER' };
			req.params = { id: 'report-123' };

			const report = {
				id: 'report-123',
				title: 'Test Report',
				description: 'Test Description',
				researcherId: 'researcher-123', // Different from req.user.id
				program: {
					id: 'program-123',
					companyId: 'company-789'
				}
			};

			prisma.report.findUnique.mockResolvedValue(report);

			// Call the controller
			await getReportById(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('not authorized') });
		});

		it('should handle server errors', async () => {
			// Setup
			req.params = { id: 'report-123' };
			prisma.report.findUnique.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await getReportById(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch report' });
		});
	});

	describe('updateReportStatus', () => {
		it('should return 400 if status and severity are missing', async () => {
			// Setup
			req.params = { id: 'report-123' };
			req.body = {}; // Empty body

			// Call the controller
			await updateReportStatus(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('must be provided') });
		});

		it('should return 404 if report does not exist', async () => {
			// Setup
			req.params = { id: 'nonexistent-report' };
			req.body = { status: 'IN_REVIEW' };
			prisma.report.findUnique.mockResolvedValue(null);

			// Call the controller
			await updateReportStatus(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
			expect(res.json).toHaveBeenCalledWith({ error: 'Report not found' });
		});

		it('should return 403 if company does not own the program', async () => {
			// Setup
			req.user = { id: 'company-456', role: 'COMPANY' };
			req.params = { id: 'report-123' };
			req.body = { status: 'IN_REVIEW' };

			const report = {
				id: 'report-123',
				title: 'Test Report',
				description: 'Test Description',
				researcherId: 'researcher-123',
				program: {
					id: 'program-123',
					companyId: 'company-789' // Different from req.user.id
				}
			};

			prisma.report.findUnique.mockResolvedValue(report);

			// Call the controller
			await updateReportStatus(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('not authorized') });
		});

		it('should update report status successfully', async () => {
			// Setup
			const companyId = 'company-789';
			req.user = { id: companyId, role: 'COMPANY' };
			req.params = { id: 'report-123' };
			req.body = { status: 'IN_REVIEW' };

			const report = {
				id: 'report-123',
				title: 'Test Report',
				description: 'Test Description',
				researcherId: 'researcher-123',
				program: {
					id: 'program-123',
					companyId // Same as req.user.id
				}
			};

			const updatedReport = {
				...report,
				status: 'IN_REVIEW'
			};

			prisma.report.findUnique.mockResolvedValue(report);
			prisma.report.update.mockResolvedValue(updatedReport);

			// Call the controller
			await updateReportStatus(req, res);

			// Assertions
			expect(prisma.report.update).toHaveBeenCalledWith({
				where: { id: req.params.id },
				data: {
					status: req.body.status
				}
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(updatedReport);
		});

		it('should update report severity successfully', async () => {
			// Setup
			const companyId = 'company-789';
			req.user = { id: companyId, role: 'COMPANY' };
			req.params = { id: 'report-123' };
			req.body = { severity: 'HIGH' };

			const report = {
				id: 'report-123',
				title: 'Test Report',
				description: 'Test Description',
				researcherId: 'researcher-123',
				program: {
					id: 'program-123',
					companyId // Same as req.user.id
				}
			};

			const updatedReport = {
				...report,
				severity: 'HIGH'
			};

			prisma.report.findUnique.mockResolvedValue(report);
			prisma.report.update.mockResolvedValue(updatedReport);

			// Call the controller
			await updateReportStatus(req, res);

			// Assertions
			expect(prisma.report.update).toHaveBeenCalledWith({
				where: { id: req.params.id },
				data: {
					severity: req.body.severity
				}
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(updatedReport);
		});

		it('should handle server errors', async () => {
			// Setup
			req.params = { id: 'report-123' };
			req.body = { status: 'IN_REVIEW' };
			prisma.report.findUnique.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await updateReportStatus(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update report' });
		});
	});
});