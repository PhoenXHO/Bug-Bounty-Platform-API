import { StatusCodes } from 'http-status-codes';

import { authenticate } from '../../src/middleware/auth.js';
import { verifyToken } from '../../src/utils/jwt.js';
import prisma from '../../src/utils/prisma.js';

// Mock dependencies
jest.mock('../../src/utils/jwt.js');
jest.mock('../../src/utils/prisma.js', () => ({
	user: {
		findUnique: jest.fn(),
	}
}));

describe('Authentication Middleware', () => {
	let req;
	let res;
	let next;

	beforeEach(() => {
		req = {
			headers: {
				authorization: 'Bearer valid-token'
			}
		};

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis()
		};

		next = jest.fn();

		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	it('should call next() when token is valid and user exists', async () => {
		const mockDecodedToken = { id: 'user-123', email: 'test@example.com' };
		verifyToken.mockReturnValue(mockDecodedToken);

		const mockUser = {
			id: 'user-123',
			name: 'Test User',
			email: 'test@example.com',
			role: 'RESEARCHER'
		};
		prisma.user.findUnique.mockResolvedValue(mockUser);

		await authenticate(req, res, next);

		expect(next).toHaveBeenCalled();

		// Check that user was attached to request
		expect(req.user).toEqual(mockUser);

		expect(verifyToken).toHaveBeenCalledWith('valid-token');
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { id: mockDecodedToken.id }
		});
	});

	it('should return 401 when no token is provided', async () => {
		req.headers.authorization = undefined;

		await authenticate(req, res, next);

		expect(next).not.toHaveBeenCalled();

		expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
		expect(res.json).toHaveBeenCalledWith({ error: 'No token provided, authorization denied' });
	});

	it('should return 401 when token verification fails', async () => {
		verifyToken.mockImplementation(() => {
			throw new Error('Invalid token');
		});

		await authenticate(req, res, next);

		expect(next).not.toHaveBeenCalled();

		expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
	});

	it('should return 401 when user does not exist', async () => {
		verifyToken.mockReturnValue({ id: 'non-existent-user' });
		prisma.user.findUnique.mockResolvedValue(null);

		await authenticate(req, res, next);

		expect(next).not.toHaveBeenCalled();

		expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
		expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
	});
});