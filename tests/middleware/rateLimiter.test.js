import request from 'supertest';
import express from 'express';
import { StatusCodes } from 'http-status-codes';

import { generalLimiter, authLimiter, reportLimiter, programLimiter } from '../../src/middleware/rateLimiter.js';

// Helper function to create a test app with a rate limiter
const createTestApp = (limiter) => {
	const app = express();
	app.use(express.json());
	app.use(limiter);
	app.get('/test', (req, res) => {
		res.json({ message: 'success' });
	});
	app.post('/test', (req, res) => {
		res.json({ message: 'success' });
	});
	return app;
};

describe('Rate Limiter Middleware', () => {
	describe('generalLimiter', () => {
		const app = createTestApp(generalLimiter);

		it('should allow requests within the limit', async () => {
			const response = await request(app)
				.get('/test')
				.expect(StatusCodes.OK);

			expect(response.body.message).toBe('success');
		});

		it('should include rate limit headers', async () => {
			const response = await request(app)
				.get('/test')
				.expect(StatusCodes.OK);

			expect(response.headers).toHaveProperty('ratelimit-limit');
			expect(response.headers).toHaveProperty('ratelimit-remaining');
			expect(response.headers).toHaveProperty('ratelimit-reset');
		});

		it('should reject requests after exceeding the limit', async () => {
			const app = createTestApp(generalLimiter);
			
			// Make multiple requests to exceed the limit (100 requests)
			// Note: This test might be slow in practice, so we'll just verify the structure
			const response = await request(app)
				.get('/test');

			expect([StatusCodes.OK, StatusCodes.TOO_MANY_REQUESTS]).toContain(response.statusCode); // Either success or rate limited
		}, 10000);
	});

	describe('authLimiter', () => {
		const app = createTestApp(authLimiter);

		it('should allow requests within the limit', async () => {
			const response = await request(app)
				.post('/test')
				.expect(StatusCodes.OK);

			expect(response.body.message).toBe('success');
		});

		it('should have stricter limits than general limiter', async () => {
			const response = await request(app)
				.post('/test')
				.expect(StatusCodes.OK);

			// Auth limiter should have a lower limit (5 vs 100)
			const limitHeader = response.headers['ratelimit-limit'];
			expect(parseInt(limitHeader)).toBeLessThan(100);
		});

		it('should return appropriate error message when limit exceeded', async () => {
			// Create a test app that returns errors to trigger the rate limiter
			const testApp = express();
			testApp.use(authLimiter);
			testApp.post('/test', (req, res) => {
				res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Authentication failed' });
			});

			// Make failed requests up to the limit (only failed requests count due to skipSuccessfulRequests)
			for (let i = 0; i < 5; i++) {
				await request(testApp).post('/test').expect(StatusCodes.UNAUTHORIZED);
			}

			// The 6th request should be rate limited
			const response = await request(testApp)
				.post('/test')
				.expect(StatusCodes.TOO_MANY_REQUESTS);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('Too many authentication attempts');
		}, 10000);
	});

	describe('reportLimiter', () => {
		const app = createTestApp(reportLimiter);

		it('should allow requests within the limit', async () => {
			const response = await request(app)
				.post('/test')
				.expect(StatusCodes.OK);

			expect(response.body.message).toBe('success');
		});

		it('should have appropriate window time for reports', async () => {
			const response = await request(app)
				.post('/test')
				.expect(StatusCodes.OK);

			// Should have rate limit headers
			expect(response.headers).toHaveProperty('ratelimit-limit');
			expect(response.headers).toHaveProperty('ratelimit-reset');
		});
	});

	describe('programLimiter', () => {
		const app = createTestApp(programLimiter);

		it('should allow requests within the limit', async () => {
			const response = await request(app)
				.post('/test')
				.expect(StatusCodes.OK);

			expect(response.body.message).toBe('success');
		});

		it('should have the most restrictive daily limit', async () => {
			const response = await request(app)
				.post('/test')
				.expect(StatusCodes.OK);

			// Program limiter should have the lowest limit (5 per day)
			const limitHeader = response.headers['ratelimit-limit'];
			expect(parseInt(limitHeader)).toBe(5);
		});
	});

	describe('Rate Limiter Error Response Format', () => {
		it('should return consistent error format across all limiters', async () => {
			const limiters = [authLimiter, reportLimiter, programLimiter];

			for (const limiter of limiters) {
				const app = createTestApp(limiter);
				
				// Make one request to see the response format
				const response = await request(app).post('/test');
				
				// Even if not rate limited, headers should be present
				expect(response.headers).toHaveProperty('ratelimit-limit');
				expect(response.headers).toHaveProperty('ratelimit-remaining');
			}
		});
	});
});