import { StatusCodes } from 'http-status-codes';

/**
 * Global error-handling middleware for the application.
 * Catches all errors and sends a consistent JSON response.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
function errorHandler(err, req, res, next) {
	// Default to 500 Internal Server Error if no status code is set
	const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

	// Log the error (optional: replace with a logging library like winston later)
	console.error(err);

	// Send a consistent error response
	res.status(statusCode).json({
		status: statusCode,
		error: err.message || 'Internal Server Error',
		details: err.details || null, // Optional: Include additional error details if provided
	});
}

export default errorHandler;
