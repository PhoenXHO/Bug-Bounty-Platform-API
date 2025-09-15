import { StatusCodes } from 'http-status-codes';

import { api, generateTestUser, createTestUser, createTestProgram, prisma } from '../helpers/testUtils.js';

describe('Programs API', () => {
	let companyUser;
	let companyToken;
	let researcherUser;
	let researcherToken;
	let testProgram;

	// Setup: Create test users and get tokens
	beforeAll(async () => {
		// Clean up any existing data
		await prisma.report.deleteMany({});
		await prisma.program.deleteMany({});
		await prisma.user.deleteMany({});

		// Register a company user
		const companyData = generateTestUser('COMPANY');
		const companyResponse = await api
			.post('/api/auth/register')
			.send(companyData);

		companyToken = companyResponse.body.token;
		companyUser = companyResponse.body.user;

		// Register a researcher user
		const researcherData = generateTestUser('RESEARCHER');
		const researcherResponse = await api
			.post('/api/auth/register')
			.send(researcherData);

		researcherToken = researcherResponse.body.token;
		researcherUser = researcherResponse.body.user;

		// Create a test program for testing GET, UPDATE, and DELETE
		testProgram = await createTestProgram(companyUser.id);
	});

	// Cleanup after all tests
	afterAll(async () => {
		await prisma.report.deleteMany({});
		await prisma.program.deleteMany({});
		await prisma.user.deleteMany({});
	});

	describe('GET /api/programs', () => {
		it('should return all programs', async () => {
			const response = await api
				.get('/api/programs')
				.expect(StatusCodes.OK);

			expect(Array.isArray(response.body)).toBe(true);

			// Should find the test program
			const foundProgram = response.body.find(p => p.id === testProgram.id);
			expect(foundProgram).toBeDefined();
			expect(foundProgram.name).toBe(testProgram.name);
		});
	});

	describe('POST /api/programs', () => {
		it('should create a new program when authenticated as a company', async () => {
			const programData = {
				name: 'New Test Program',
				description: 'This is a program created during integration tests',
				scope: 'api.example.com',
				rewardMin: 200,
				rewardMax: 2000
			};

			const response = await api
				.post('/api/programs')
				.set('Authorization', `Bearer ${companyToken}`)
				.send(programData)
				.expect(StatusCodes.CREATED);

			// Verify response
			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('name', programData.name);
			expect(response.body).toHaveProperty('description', programData.description);
			expect(response.body).toHaveProperty('companyId', companyUser.id);

			// Verify database
			const dbProgram = await prisma.program.findUnique({
				where: { id: response.body.id }
			});
			expect(dbProgram).not.toBeNull();
			expect(dbProgram.name).toBe(programData.name);
		});

		it('should return 401 when not authenticated', async () => {
			const programData = {
				name: 'Unauthorized Program',
				description: 'This program should not be created',
				scope: 'api.example.com',
				rewardMin: 100,
				rewardMax: 1000
			};

			await api
				.post('/api/programs')
				.send(programData)
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 403 when authenticated as a researcher', async () => {
			const programData = {
				name: 'Forbidden Program',
				description: 'This program should not be created',
				scope: 'api.example.com',
				rewardMin: 100,
				rewardMax: 1000
			};

			await api
				.post('/api/programs')
				.set('Authorization', `Bearer ${researcherToken}`)
				.send(programData)
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 400 when required fields are missing', async () => {
			// Missing name
			await api
				.post('/api/programs')
				.set('Authorization', `Bearer ${companyToken}`)
				.send({
					description: 'Missing name',
					scope: 'api.example.com',
					rewardMin: 100,
					rewardMax: 1000
				})
				.expect(StatusCodes.BAD_REQUEST);

			// Missing description
			await api
				.post('/api/programs')
				.set('Authorization', `Bearer ${companyToken}`)
				.send({
					name: 'Missing Description',
					scope: 'api.example.com',
					rewardMin: 100,
					rewardMax: 1000
				})
				.expect(StatusCodes.BAD_REQUEST);
		});
	});

	describe('GET /api/programs/:id', () => {
		it('should return a specific program by ID', async () => {
			const response = await api
				.get(`/api/programs/${testProgram.id}`)
				.expect(StatusCodes.OK);

			expect(response.body).toHaveProperty('id', testProgram.id);
			expect(response.body).toHaveProperty('name', testProgram.name);
		});

		it('should return 404 for non-existent program ID', async () => {
			await api
				.get('/api/programs/nonexistentid')
				.expect(StatusCodes.NOT_FOUND);
		});
	});

	describe('PUT /api/programs/:id', () => {
		it('should update a program when authenticated as the owner company', async () => {
			const updateData = {
				name: 'Updated Program Name',
				description: 'Updated program description',
				scope: 'updated.example.com',
				rewardMin: 500,
				rewardMax: 5000
			};

			const response = await api
				.put(`/api/programs/${testProgram.id}`)
				.set('Authorization', `Bearer ${companyToken}`)
				.send(updateData)
				.expect(StatusCodes.OK);

			expect(response.body).toHaveProperty('id', testProgram.id);
			expect(response.body).toHaveProperty('name', updateData.name);
			expect(response.body).toHaveProperty('description', updateData.description);

			// Verify database update
			const dbProgram = await prisma.program.findUnique({
				where: { id: testProgram.id }
			});
			expect(dbProgram.name).toBe(updateData.name);
		});

		it('should return 403 when authenticated as a different company', async () => {
			// Create another company user
			const anotherCompanyData = generateTestUser('COMPANY');
			const anotherCompanyResponse = await api
				.post('/api/auth/register')
				.send(anotherCompanyData);
			const anotherCompanyToken = anotherCompanyResponse.body.token;

			await api
				.put(`/api/programs/${testProgram.id}`)
				.set('Authorization', `Bearer ${anotherCompanyToken}`)
				.send({ name: 'Should Not Update' })
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 403 when authenticated as a researcher', async () => {
			await api
				.put(`/api/programs/${testProgram.id}`)
				.set('Authorization', `Bearer ${researcherToken}`)
				.send({ name: 'Should Not Update' })
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 404 for non-existent program ID', async () => {
			await api
				.put('/api/programs/nonexistentid')
				.set('Authorization', `Bearer ${companyToken}`)
				.send({ name: 'Not Found Program' })
				.expect(StatusCodes.NOT_FOUND);
		});
	});

	describe('DELETE /api/programs/:id', () => {
		it('should return 403 when authenticated as a researcher', async () => {
			await api
				.delete(`/api/programs/${testProgram.id}`)
				.set('Authorization', `Bearer ${researcherToken}`)
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 403 when authenticated as a different company', async () => {
			// Create another company user
			const anotherCompanyData = generateTestUser('COMPANY');
			const anotherCompanyResponse = await api
				.post('/api/auth/register')
				.send(anotherCompanyData);
			const anotherCompanyToken = anotherCompanyResponse.body.token;

			await api
				.delete(`/api/programs/${testProgram.id}`)
				.set('Authorization', `Bearer ${anotherCompanyToken}`)
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should delete a program when authenticated as the owner company', async () => {
			// Create a new program specifically for this test
			const newProgram = await createTestProgram(companyUser.id);

			await api
				.delete(`/api/programs/${newProgram.id}`)
				.set('Authorization', `Bearer ${companyToken}`)
				.expect(StatusCodes.NO_CONTENT);

			// Verify deletion
			const dbProgram = await prisma.program.findUnique({
				where: { id: newProgram.id }
			});
			expect(dbProgram).toBeNull();
		});

		it('should return 404 for non-existent program ID', async () => {
			await api
				.delete('/api/programs/nonexistentid')
				.set('Authorization', `Bearer ${companyToken}`)
				.expect(StatusCodes.NOT_FOUND);
		});
	});
});