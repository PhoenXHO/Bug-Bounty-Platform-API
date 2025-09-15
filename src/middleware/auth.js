import { StatusCodes } from 'http-status-codes';

import { verifyToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';

/**
 * Middleware to authenticate users by verifying a JWT.
 * If the token is valid, it attaches the user object to the request.
 * @param {import('express').Request} req The request object
 * @param {import('express').Response} res The response object
 * @param {import('express').NextFunction} next The next middleware function
 */
async function authenticate(req, res, next) {
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'No token provided, authorization denied' });
	}

	try {
		const decoded = verifyToken(token);
		if (!decoded) {
			return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
		}

		const user = await prisma.user.findUnique({ where: { id: decoded.id } });
		if (!user) {
			return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not found' });
		}

		// Attach user to the request object
		req.user = user;
		next();
	} catch (error) {
		return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
	}
}

/**
 * Middleware to authorize users based on their role.
 * @param {string[]} allowedRoles - An array of roles that are allowed to access the route.
 * @returns {import('express').RequestHandler} The middleware function
 */
function authorizeRole(allowedRoles) {
	return (req, res, next) => {
		if (!req.user || !allowedRoles.includes(req.user.role)) {
			return res.status(StatusCodes.FORBIDDEN).json({ error: 'You do not have permission to perform this action' });
		}
		next();
	};
}

export { authenticate, authorizeRole };
