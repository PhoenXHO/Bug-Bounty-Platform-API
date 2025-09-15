import { prisma, cleanupTestData } from './helpers/testUtils.js';

// Global setup - runs once before all tests
export async function setup() {
	console.log('\x1b[34m%s\x1b[0m', 'Setting up integration test environment...');
	// Ensure the test database is clean
	await cleanupTestData();
	console.log('\x1b[32m%s\x1b[0m', 'Test environment ready!');
}

// Global teardown - runs once after all tests
export async function teardown() {
	console.log('\x1b[34m%s\x1b[0m', 'Cleaning up integration test environment...');
	await cleanupTestData();
	await prisma.$disconnect();
	console.log('\x1b[32m%s\x1b[0m', 'Test environment cleaned up!');
}