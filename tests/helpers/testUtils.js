import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import supertest from 'supertest';

import app from '../../src/server.js';

// Create a new Prisma client specifically for tests
const prisma = new PrismaClient();

// Create a supertest instance for making HTTP requests
const api = supertest(app);

/**
 * Utility to generate a test user object
 * @param {string} role Role of the user (e.g., 'RESEARCHER', 'COMPANY', 'ADMIN')
 * @returns {Object} The generated test user object
 */
const generateTestUser = (role = 'RESEARCHER') => ({
	name: `Test ${role}`,
	email: `test-${role.toLowerCase()}-${Date.now()}@example.com`,
	password: 'Password123!',
	role
});

/**
 * Helper function to create a test user directly in the database
 * @param {Object} userData User data object with name, email, password, and role
 * @returns {Promise<Object>} The created user object
 */
const createTestUser = async (userData) => {
	const hashedPassword = await import('../src/utils/bcrypt.js').then(
		module => module.hashPassword(userData.password)
	);

	return prisma.user.create({
		data: {
			name: userData.name,
			email: userData.email,
			passwordHash: hashedPassword,
			role: userData.role || 'RESEARCHER'
		}
	});
};

/**
 * Helper function to authenticate a user and get a token
 * @param {string} email The email of the user
 * @param {string} password The password of the user
 * @returns {Promise<string>} The authentication token
 */
const authenticateUser = async (email, password) => {
	const response = await api
		.post('/auth/login')
		.send({ email, password })
		.expect(200);

	return response.body.token;
};

/**
 * Helper function to create a test program
 * @param {string} companyId The ID of the company user creating the program
 * @returns {Promise<Object>} The created program object
 */
const createTestProgram = async (companyId) => {
	return prisma.program.create({
		data: {
			name: `Test Program ${Date.now()}`,
			description: 'This is a test program created for integration tests',
			scope: 'api.testprogram.com',
			rewardMin: 100,
			rewardMax: 1000,
			companyId
		}
	});
};

/**
 * Helper function to create a test report
 * @param {string} programId The ID of the program for this report
 * @param {string} researcherId The ID of the researcher creating the report
 * @returns {Promise<Object>} The created report object
 */
const createTestReport = async (programId, researcherId) => {
	return prisma.report.create({
		data: {
			title: `Test Report ${Date.now()}`,
			description: 'This is a test vulnerability report created for integration tests',
			programId,
			researcherId,
			status: 'OPEN',
		}
	});
};

/**
 * Cleanup function to delete all test data from the database
 */
const cleanupTestData = async () => {
	// Delete all reports, then programs, then users
	await prisma.report.deleteMany({});
	await prisma.program.deleteMany({});
	await prisma.user.deleteMany({});
};

export {
	prisma,
	api,
	generateTestUser,
	createTestUser,
	authenticateUser,
	createTestProgram,
	createTestReport,
	cleanupTestData
};