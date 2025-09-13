import { StatusCodes } from 'http-status-codes';

import { createProgram, getPrograms, updateProgram, deleteProgram } from '../../src/controllers/programController.js';
import prisma from '../../src/utils/prisma.js';

// Mock dependencies
jest.mock('../../src/utils/prisma.js');

describe('Program Controller', () => {
	let req;
	let res;

	beforeEach(() => {
		// Mock the prisma program model
		prisma.program = {
			create: jest.fn(),
			findMany: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		};

		req = {
			body: {},
			params: {},
			user: {
				id: 'company-123',
				role: 'COMPANY'
			}
		};

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis()
		};

		jest.clearAllMocks();
	});

	describe('createProgram', () => {
		it('should return 400 if required fields are missing', async () => {
			// Call with empty body
			await createProgram(req, res);

			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
		});

		it('should create a program successfully', async () => {
			// Setup
			req.body = {
				name: 'Test Program',
				description: 'Test Description',
				scope: 'api.example.com',
				rewardMin: 100,
				rewardMax: 1000
			};

			const createdProgram = {
				id: 'program-123',
				...req.body,
				companyId: req.user.id,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			prisma.program.create.mockResolvedValue(createdProgram);

			// Call the controller
			await createProgram(req, res);

			// Assertions
			expect(prisma.program.create).toHaveBeenCalledWith({
				data: {
					name: req.body.name,
					description: req.body.description,
					scope: req.body.scope,
					rewardMin: req.body.rewardMin,
					rewardMax: req.body.rewardMax,
					companyId: req.user.id
				}
			});

			expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
			expect(res.json).toHaveBeenCalledWith(createdProgram);
		});

		it('should handle server errors', async () => {
			// Setup
			req.body = {
				name: 'Test Program',
				description: 'Test Description',
				scope: 'api.example.com',
				rewardMin: 100,
				rewardMax: 1000
			};

			prisma.program.create.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await createProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create program' });
		});
	});

	describe('getPrograms', () => {
		it('should return all programs', async () => {
			// Setup
			const programs = [
				{ id: 'program-1', name: 'Program 1' },
				{ id: 'program-2', name: 'Program 2' }
			];

			prisma.program.findMany.mockResolvedValue(programs);

			// Call the controller
			await getPrograms(req, res);

			// Assertions
			expect(prisma.program.findMany).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(programs);
		});

		it('should handle server errors', async () => {
			// Setup
			prisma.program.findMany.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await getPrograms(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch programs' });
		});
	});

	describe('updateProgram', () => {
		it('should return 404 if program does not exist', async () => {
			// Setup
			req.params = { id: 'nonexistent-program' };
			req.body = { name: 'Updated Program' };

			prisma.program.findUnique.mockResolvedValue(null);

			// Call the controller
			await updateProgram(req, res);

			// Assertions
			expect(prisma.program.findUnique).toHaveBeenCalledWith({
				where: { id: req.params.id }
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
			expect(res.json).toHaveBeenCalledWith({ error: 'Program not found' });
		});

		it('should return 403 if user does not own the program', async () => {
			// Setup
			req.params = { id: 'program-123' };
			req.user = { id: 'company-456' };
			req.body = { name: 'Updated Program' };

			prisma.program.findUnique.mockResolvedValue({
				id: 'program-123',
				companyId: 'company-789' // Different from req.user.id
			});

			// Call the controller
			await updateProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('not authorized') });
		});

		it('should update the program if user is authorized', async () => {
			// Setup
			req.params = { id: 'program-123' };
			req.user = { id: 'company-123' };
			req.body = {
				name: 'Updated Program',
				description: 'Updated Description',
				scope: 'updated.example.com',
				rewardMin: 200,
				rewardMax: 2000
			};

			prisma.program.findUnique.mockResolvedValue({
				id: 'program-123',
				companyId: 'company-123' // Same as req.user.id
			});

			const updatedProgram = {
				id: 'program-123',
				...req.body,
				companyId: 'company-123'
			};

			prisma.program.update.mockResolvedValue(updatedProgram);

			// Call the controller
			await updateProgram(req, res);

			// Assertions
			expect(prisma.program.update).toHaveBeenCalledWith({
				where: { id: req.params.id },
				data: req.body
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith(updatedProgram);
		});

		it('should handle server errors', async () => {
			// Setup
			req.params = { id: 'program-123' };
			req.body = { name: 'Updated Program' };

			prisma.program.findUnique.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await updateProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update program' });
		});
	});

	describe('deleteProgram', () => {
		it('should return 404 if program does not exist', async () => {
			// Setup
			req.params = { id: 'nonexistent-program' };

			prisma.program.findUnique.mockResolvedValue(null);

			// Call the controller
			await deleteProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
			expect(res.json).toHaveBeenCalledWith({ error: 'Program not found' });
		});

		it('should return 403 if user does not own the program', async () => {
			// Setup
			req.params = { id: 'program-123' };
			req.user = { id: 'company-456' };

			prisma.program.findUnique.mockResolvedValue({
				id: 'program-123',
				companyId: 'company-789' // Different from req.user.id
			});

			// Call the controller
			await deleteProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('not authorized') });
		});

		it('should delete the program if user is authorized', async () => {
			// Setup
			req.params = { id: 'program-123' };
			req.user = { id: 'company-123' };

			prisma.program.findUnique.mockResolvedValue({
				id: 'program-123',
				companyId: 'company-123' // Same as req.user.id
			});

			// Call the controller
			await deleteProgram(req, res);

			// Assertions
			expect(prisma.program.delete).toHaveBeenCalledWith({
				where: { id: req.params.id }
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
			expect(res.send).toHaveBeenCalled();
		});

		it('should handle server errors', async () => {
			// Setup
			req.params = { id: 'program-123' };

			prisma.program.findUnique.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await deleteProgram(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete program' });
		});
	});
});