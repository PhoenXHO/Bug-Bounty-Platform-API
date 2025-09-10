import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Seeding database...');

	// Delete existing data
	await prisma.program.deleteMany({
		where: {
			name: 'Sample Bug Bounty Program'
		},
	});
	await prisma.user.deleteMany({
		where: {
			email: {in: ['admin@example.com', 'company@example.com', 'researcher@example.com']}
		},
	});

	// Create sample users
	const admin = await prisma.user.create({
		data: {
			name: 'Admin User',
			email: 'admin@example.com',
			passwordHash: '$2b$10$q8lHRF2NC7s.thazu3HtdeFB6oQUlLgmj5QRxa9LSwg6IpmhsKd..', // password: 'testtest'
			role: 'ADMIN',
		},
	});

	const company = await prisma.user.create({
		data: {
			name: 'Company User',
			email: 'company@example.com',
			passwordHash: '$2b$10$q8lHRF2NC7s.thazu3HtdeFB6oQUlLgmj5QRxa9LSwg6IpmhsKd..',
			role: 'COMPANY',
		},
	});

	const researcher = await prisma.user.create({
		data: {
			name: 'Researcher User',
			email: 'researcher@example.com',
			passwordHash: '$2b$10$q8lHRF2NC7s.thazu3HtdeFB6oQUlLgmj5QRxa9LSwg6IpmhsKd..',
			role: 'RESEARCHER',
		},
	});

	// Create sample programs
	const program = await prisma.program.create({
		data: {
			name: 'Sample Bug Bounty Program',
			description: 'Find and report bugs in our system.',
			scope: 'api.example.com',
			rewardMin: 100,
			rewardMax: 1000,
			companyId: company.id,
		},
	});

	// Create sample reports
	await prisma.report.create({
		data: {
			title: 'Sample Bug Report',
			description: 'This is a sample bug report.',
			severity: 'HIGH',
			status: 'OPEN',
			programId: program.id,
			researcherId: researcher.id,
		},
	});

	console.log('Database seeded successfully!');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});