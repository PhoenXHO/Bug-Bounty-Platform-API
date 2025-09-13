import jwt from 'jsonwebtoken';

import { generateToken, verifyToken } from '../../src/utils/jwt.js';

// Mock environment variables and jwt functions
jest.mock('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret-key';

describe('JWT utility functions', () => {
	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		name: 'Test User'
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('generateToken', () => {
		it('should call jwt.sign with correct parameters', () => {
			jwt.sign.mockReturnValue('mock-token');

			const token = generateToken(mockUser);

			expect(jwt.sign).toHaveBeenCalledWith(
				{ id: mockUser.id, email: mockUser.email },
				process.env.JWT_SECRET,
				{ expiresIn: '1h' }
			);
			expect(token).toBe('mock-token');
		});
	});

	describe('verifyToken', () => {
		it('should call jwt.verify with correct parameters', () => {
			const mockDecodedToken = { id: mockUser.id, email: mockUser.email };
			jwt.verify.mockReturnValue(mockDecodedToken);

			const token = 'test-token';
			const result = verifyToken(token);

			expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
			expect(result).toBe(mockDecodedToken);
		});

		it('should throw an error for invalid token', () => {
			jwt.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			const token = 'invalid-token';

			expect(() => {
				verifyToken(token);
			}).toThrow();
		});
	});
});