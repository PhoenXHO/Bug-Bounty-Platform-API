import { PrismaClient } from '@prisma/client';

import { hashPassword } from '../../src/utils/bcrypt.js';

const prisma = new PrismaClient();

/**
 * Seeds the test database with sample data for testing
 * @returns {Object} An object containing created users and programs for reference in tests
 */
async function seed() {
	console.log('\x1b[34m%s\x1b[0m', 'Seeding test database with sample data...');

	try {
		// Clean up existing data
		await prisma.report.deleteMany({});
		await prisma.program.deleteMany({});
		await prisma.user.deleteMany({});

		console.log('\x1b[33m%s\x1b[0m', 'Existing data cleared');

		// Create sample users
		const adminHashedPassword = await hashPassword('admin123');
		const companyHashedPassword = await hashPassword('company123');
		const researcherHashedPassword = await hashPassword('researcher123');

		const admin = await prisma.user.create({
			data: {
				name: 'Admin User',
				email: 'admin@test.com',
				passwordHash: adminHashedPassword,
				role: 'ADMIN'
			}
		});

		const company = await prisma.user.create({
			data: {
				name: 'Company User',
				email: 'company@test.com',
				passwordHash: companyHashedPassword,
				role: 'COMPANY'
			}
		});

		const researcher = await prisma.user.create({
			data: {
				name: 'Researcher User',
				email: 'researcher@test.com',
				passwordHash: researcherHashedPassword,
				role: 'RESEARCHER'
			}
		});

		console.log('\x1b[32m%s\x1b[0m', 'Sample users created');

		// Create sample programs
		const program1 = await prisma.program.create({
			data: {
				name: 'Web Application Security',
				description: 'Find vulnerabilities in our web application.',
				scope: 'app.example.com',
				rewardMin: 100,
				rewardMax: 5000,
				companyId: company.id
			}
		});

		const program2 = await prisma.program.create({
			data: {
				name: 'API Security',
				description: 'Find vulnerabilities in our REST API.',
				scope: 'api.example.com',
				rewardMin: 200,
				rewardMax: 3000,
				companyId: company.id
			}
		});

		console.log('\x1b[32m%s\x1b[0m', 'Sample programs created');

		// Create sample reports
		await prisma.report.create({
			data: {
				title: 'XSS Vulnerability',
				description: 'Found a cross-site scripting vulnerability in the search form.',
				severity: 'HIGH',
				status: 'OPEN',
				programId: program1.id,
				researcherId: researcher.id
			}
		});

		await prisma.report.create({
			data: {
				title: 'SQL Injection',
				description: 'Found a SQL injection vulnerability in the login form.',
				severity: 'CRITICAL',
				status: 'IN_REVIEW',
				programId: program1.id,
				researcherId: researcher.id
			}
		});

		console.log('\x1b[32m%s\x1b[0m', 'Sample reports created');
		console.log('\x1b[32m%s\x1b[0m', 'Test database seeded successfully!');

		// Return the created entities for reference in tests
		return {
			users: { admin, company, researcher },
			programs: { program1, program2 }
		};
	} catch (error) {
		console.error('\x1b[31m%s\x1b[0m', 'Error seeding test database:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

export { seed };