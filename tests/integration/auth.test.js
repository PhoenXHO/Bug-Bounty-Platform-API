import { StatusCodes } from 'http-status-codes';

import { api, generateTestUser, createTestUser, prisma } from '../helpers/testUtils.js';

// Ensure clean state before and after tests
beforeAll(async () => {
	await prisma.user.deleteMany({});
});

afterAll(async () => {
	await prisma.user.deleteMany({});
});

describe('Authentication API', () => {
	describe('POST /api/auth/register', () => {
		it('should register a new user successfully', async () => {
			const userData = generateTestUser();

			const response = await api
				.post('/api/auth/register')
				.send(userData)
				.expect(StatusCodes.CREATED);

			// Verify response structure
			expect(response.body).toHaveProperty('token');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('id');
			expect(response.body.user).toHaveProperty('name', userData.name);
			expect(response.body.user).toHaveProperty('email', userData.email);
			expect(response.body.user).toHaveProperty('role', userData.role);

			// Verify user was stored in database
			const dbUser = await prisma.user.findUnique({
				where: { email: userData.email }
			});
			expect(dbUser).not.toBeNull();
			expect(dbUser.name).toBe(userData.name);
		});

		it('should return 400 if required fields are missing', async () => {
			// Missing email
			await api
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					password: 'password123'
				})
				.expect(StatusCodes.BAD_REQUEST);

			// Missing name
			await api
				.post('/api/auth/register')
				.send({
					email: 'test@example.com',
					password: 'password123'
				})
				.expect(StatusCodes.BAD_REQUEST);

			// Missing password
			await api
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					email: 'test@example.com'
				})
				.expect(StatusCodes.BAD_REQUEST);
		});

		it('should return 409 if email is already in use', async () => {
			const userData = generateTestUser();

			// First registration
			await api
				.post('/api/auth/register')
				.send(userData)
				.expect(StatusCodes.CREATED);

			// Second registration with the same email
			await api
				.post('/api/auth/register')
				.send(userData)
				.expect(StatusCodes.CONFLICT);
		});
	});

	describe('POST /api/auth/login', () => {
		it('should login successfully with valid credentials', async () => {
			const userData = generateTestUser();

			// Register a user
			await api
				.post('/api/auth/register')
				.send(userData);

			// Login with same credentials
			const response = await api
				.post('/api/auth/login')
				.send({
					email: userData.email,
					password: userData.password
				})
				.expect(StatusCodes.OK);

			// Verify response structure
			expect(response.body).toHaveProperty('token');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', userData.email);
		});

		it('should return 401 with invalid credentials', async () => {
			const userData = generateTestUser();

			// Register a user
			await api
				.post('/api/auth/register')
				.send(userData);

			// Login with wrong password
			await api
				.post('/api/auth/login')
				.send({
					email: userData.email,
					password: 'wrongpassword'
				})
				.expect(StatusCodes.UNAUTHORIZED);

			// Login with non-existent email
			await api
				.post('/api/auth/login')
				.send({
					email: 'nonexistent@example.com',
					password: userData.password
				})
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 400 if required fields are missing', async () => {
			// Missing email
			await api
				.post('/api/auth/login')
				.send({
					password: 'password123'
				})
				.expect(StatusCodes.BAD_REQUEST);

			// Missing password
			await api
				.post('/api/auth/login')
				.send({
					email: 'test@example.com'
				})
				.expect(StatusCodes.BAD_REQUEST);
		});
	});

	describe('GET /api/auth/me', () => {
		it('should return current user information with valid token', async () => {
			const userData = generateTestUser();

			// Register a user
			const registerResponse = await api
				.post('/api/auth/register')
				.send(userData);

			const token = registerResponse.body.token;

			// Get current user
			const response = await api
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${token}`)
				.expect(StatusCodes.OK);

			// Verify response structure
			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', userData.email);
			expect(response.body.user).toHaveProperty('name', userData.name);
			expect(response.body.user).not.toHaveProperty('passwordHash');
		});

		it('should return 401 without a token', async () => {
			await api
				.get('/api/auth/me')
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 401 with an invalid token', async () => {
			await api
				.get('/api/auth/me')
				.set('Authorization', 'Bearer invalidtoken')
				.expect(StatusCodes.UNAUTHORIZED);
		});
	});
});