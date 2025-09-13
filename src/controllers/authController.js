import { StatusCodes } from 'http-status-codes';
import { hashPassword, comparePasswords } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';

/**
 * Validates input, hashes the password, creates a new user, then generates a JWT.
 * @param {import('express').Request} req The request object, with body containing `{ name, email, password, role }`
 * @returns {Promise<{
 *     token: string,
 *     user: { id: string, name: string, email: string }
 * }>} The user information (without password) and JWT
 */
async function register(req, res) {
	const { name, email, password, role } = req.body;

	if (!name || !email || !password) {
		return res.status(StatusCodes.BAD_REQUEST).json({ error: 'All fields are required' });
	}

	try {
		// Hash password, create user, and generate token
		const hashedPassword = await hashPassword(password);
		const user = await prisma.user.create({
			data: { name: name, email: email, passwordHash: hashedPassword, role: role }
		});
		const token = generateToken(user);

		// Omit password hash from the returned user object
		const { passwordHash, ...userWithoutPassword } = user;

		return res.status(StatusCodes.CREATED).json({
			token,
			user: userWithoutPassword
		});
	} catch (error) {
		// Check for unique constraint violation (email already exists)
		if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
			return res.status(StatusCodes.CONFLICT).json({ error: 'A user with this email already exists' });
		}
		// Generic server error
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong' });
	}
}

/**
 * Handles user login, validates credentials, and returns a JWT.
 * @param {import('express').Request} req The request object, with body containing `{ email, password }`
 * @returns {Promise<{
 *     token: string,
 *     user: { id: string, name: string, email: string, role: string }
 * }>} The user information (without password) and JWT
 */
async function login(req, res) {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(StatusCodes.BAD_REQUEST).json({ error: 'All fields are required' });
	}

	try {
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user || !(await comparePasswords(password, user.passwordHash))) {
			return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid email or password' });
		}

		const token = generateToken(user);

		// Omit password hash from the returned user object
		const { passwordHash, ...userWithoutPassword } = user;

		return res.status(StatusCodes.OK).json({
			token,
			user: userWithoutPassword
		});
	} catch (error) {
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong' });
	}
}

/**
 * Retrieves the current user's information from the request object.
 * This controller should be used after an authentication middleware.
 * @param {import('express').Request} req The request object (with req.user attached by middleware).
 * @returns {Promise<{
 *     user: { id: string, name: string, email: string, role: string }
 * }>} The user information (without password)
 */
async function me(req, res) {
	// The user is attached by the authentication middleware, just return it
	const { passwordHash, ...user } = req.user;
	return res.status(StatusCodes.OK).json({ user });
}

export { register, login, me };