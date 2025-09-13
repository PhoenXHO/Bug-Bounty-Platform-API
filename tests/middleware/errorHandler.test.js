import { StatusCodes } from 'http-status-codes';

import errorHandler from '../../src/middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
	// Mock console.error to prevent cluttering test output
	const originalConsoleError = console.error;
	beforeAll(() => {
		console.error = jest.fn();
	});

	afterAll(() => {
		console.error = originalConsoleError;
	});

	// Mock request, response and next function
	let req;
	let res;
	let next;

	beforeEach(() => {
		req = {};
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis()
		};
		next = jest.fn();
	});

	it('should handle errors with custom status code and message', () => {
		// Create a custom error with status code
		const customError = new Error('Custom error message');
		customError.statusCode = StatusCodes.BAD_REQUEST;

		errorHandler(customError, req, res, next);

		// Verify the response
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.json).toHaveBeenCalledWith({
			status: StatusCodes.BAD_REQUEST,
			error: 'Custom error message',
			details: null
		});
	});

	it('should handle errors with additional details', () => {
		// Create a custom error with details
		const customError = new Error('Validation failed');
		customError.statusCode = StatusCodes.BAD_REQUEST;
		customError.details = {
			email: 'Email is required',
			password: 'Password must be at least 8 characters'
		};

		errorHandler(customError, req, res, next);

		// Verify the response
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.json).toHaveBeenCalledWith({
			status: StatusCodes.BAD_REQUEST,
			error: 'Validation failed',
			details: {
				email: 'Email is required',
				password: 'Password must be at least 8 characters'
			}
		});
	});

	it('should default to 500 status for errors without a status code', () => {
		// Create a generic error without status code
		const genericError = new Error('Something went wrong');

		errorHandler(genericError, req, res, next);

		// Verify the response
		expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
		expect(res.json).toHaveBeenCalledWith({
			status: StatusCodes.INTERNAL_SERVER_ERROR,
			error: 'Something went wrong',
			details: null
		});
	});

	it('should log the error to console', () => {
		const error = new Error('Test error');

		errorHandler(error, req, res, next);

		// Verify that error was logged
		expect(console.error).toHaveBeenCalledWith(error);
	});
});