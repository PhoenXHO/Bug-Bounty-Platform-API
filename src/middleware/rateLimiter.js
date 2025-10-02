import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for API endpoints
 * Allows 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		error: 'Too many requests from this IP, please try again later.',
		retryAfter: '15 minutes'
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * Allows 5 requests per 15 minutes per IP to prevent brute force attacks
 */
export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 login attempts per windowMs
	message: {
		error: 'Too many authentication attempts from this IP, please try again later.',
		retryAfter: '15 minutes'
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true, // Only count failed requests toward the rate limit
});

/**
 * Rate limiter for report creation
 * Allows 10 reports per hour per IP to prevent spam
 */
export const reportLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 10, // Limit each IP to 10 report submissions per hour
	message: {
		error: 'Too many reports submitted from this IP, please try again later.',
		retryAfter: '1 hour'
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * Rate limiter for program creation
 * Allows 5 programs per day per IP
 */
export const programLimiter = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, // 24 hours
	max: 5, // Limit each IP to 5 program creations per day
	message: {
		error: 'Too many programs created from this IP, please try again tomorrow.',
		retryAfter: '24 hours'
	},
	standardHeaders: true,
	legacyHeaders: false,
});