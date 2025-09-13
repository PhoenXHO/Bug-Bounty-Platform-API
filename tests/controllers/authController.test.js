import { StatusCodes } from 'http-status-codes';

import { register, login, me } from '../../src/controllers/authController.js';
import { hashPassword, comparePasswords } from '../../src/utils/bcrypt.js';
import { generateToken } from '../../src/utils/jwt.js';
import prisma from '../../src/utils/prisma.js';

// Mock dependencies
jest.mock('../../src/utils/bcrypt.js');
jest.mock('../../src/utils/jwt.js');
jest.mock('../../src/utils/prisma.js', () => ({
	user: {
		create: jest.fn(),
		findUnique: jest.fn(),
	}
}));

describe('Auth Controller', () => {
	let req;
	let res;

	beforeEach(() => {
		req = { body: {} };
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis()
		};

		jest.clearAllMocks();
	});

	describe('register', () => {
		it('should return 400 if required fields are missing', async () => {
			// Test with empty body
			await register(req, res);

			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
		});

		it('should create a new user and return token and user info without password', async () => {
			// Setup
			req.body = {
				name: 'Test User',
				email: 'test@example.com',
				password: 'password123',
				role: 'RESEARCHER'
			};

			const hashedPassword = 'hashedPassword123';
			hashPassword.mockResolvedValue(hashedPassword);

			const createdUser = {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com',
				role: 'RESEARCHER',
				passwordHash: hashedPassword
			};
			prisma.user.create.mockResolvedValue(createdUser);

			const token = 'generated-token';
			generateToken.mockReturnValue(token);

			// Call the controller
			await register(req, res);

			// Assertions
			expect(hashPassword).toHaveBeenCalledWith(req.body.password);
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					name: req.body.name,
					email: req.body.email,
					passwordHash: hashedPassword,
					role: req.body.role
				}
			});
			expect(generateToken).toHaveBeenCalledWith(createdUser);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
			expect(res.json).toHaveBeenCalledWith({
				token,
				user: {
					id: createdUser.id,
					name: createdUser.name,
					email: createdUser.email,
					role: createdUser.role
				}
			});
		});

		it('should return 409 if email already exists', async () => {
			// Setup
			req.body = {
				name: 'Test User',
				email: 'existing@example.com',
				password: 'password123'
			};

			const duplicateEmailError = {
				code: 'P2002',
				meta: { target: ['email'] }
			};
			prisma.user.create.mockRejectedValue(duplicateEmailError);

			// Call the controller
			await register(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('exists') });
		});

		it('should handle server errors', async () => {
			// Setup
			req.body = {
				name: 'Test User',
				email: 'test@example.com',
				password: 'password123'
			};

			prisma.user.create.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await register(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
		});
	});

	describe('login', () => {
		it('should return 400 if required fields are missing', async () => {
			// Test with empty body
			await login(req, res);

			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('required') });
		});

		it('should return 401 if user does not exist', async () => {
			// Setup
			req.body = {
				email: 'nonexistent@example.com',
				password: 'password123'
			};

			prisma.user.findUnique.mockResolvedValue(null);

			// Call the controller
			await login(req, res);

			// Assertions
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: req.body.email }
			});
			expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
			expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
		});

		it('should return 401 if password is incorrect', async () => {
			// Setup
			req.body = {
				email: 'test@example.com',
				password: 'wrongPassword'
			};

			const user = {
				id: 'user-123',
				email: 'test@example.com',
				passwordHash: 'hashedCorrectPassword'
			};
			prisma.user.findUnique.mockResolvedValue(user);
			comparePasswords.mockResolvedValue(false);

			// Call the controller
			await login(req, res);

			// Assertions
			expect(comparePasswords).toHaveBeenCalledWith('wrongPassword', 'hashedCorrectPassword');
			expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
			expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
		});

		it('should return token and user without password if credentials are correct', async () => {
			// Setup
			req.body = {
				email: 'test@example.com',
				password: 'correctPassword'
			};

			const user = {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com',
				role: 'RESEARCHER',
				passwordHash: 'hashedCorrectPassword'
			};
			prisma.user.findUnique.mockResolvedValue(user);
			comparePasswords.mockResolvedValue(true);

			const token = 'generated-token';
			generateToken.mockReturnValue(token);

			// Call the controller
			await login(req, res);

			// Assertions
			expect(comparePasswords).toHaveBeenCalledWith('correctPassword', 'hashedCorrectPassword');
			expect(generateToken).toHaveBeenCalledWith(user);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith({
				token,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role
				}
			});
		});

		it('should handle server errors', async () => {
			// Setup
			req.body = {
				email: 'test@example.com',
				password: 'password123'
			};

			prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

			// Call the controller
			await login(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
		});
	});

	describe('me', () => {
		it('should return the user from req.user without password hash', async () => {
			// Setup
			req.user = {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com',
				role: 'RESEARCHER',
				passwordHash: 'hashedPassword'
			};

			// Call the controller
			await me(req, res);

			// Assertions
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.json).toHaveBeenCalledWith({
				user: {
					id: req.user.id,
					name: req.user.name,
					email: req.user.email,
					role: req.user.role
				}
			});
		});
	});
});