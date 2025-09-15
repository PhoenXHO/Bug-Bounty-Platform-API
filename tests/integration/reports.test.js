import { StatusCodes } from 'http-status-codes';

import { api, generateTestUser, createTestProgram, prisma, createTestReport } from '../helpers/testUtils.js';

describe('Reports API', () => {
	let companyUser;
	let companyToken;
	let researcherUser;
	let researcherToken;
	let testProgram;
	let testReport;

	// Setup: Create test users, program, and report
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

		// Create a test program owned by the company
		testProgram = await createTestProgram(companyUser.id);

		// Create a test report for testing GET and UPDATE endpoints
		testReport = await createTestReport(testProgram.id, researcherUser.id);
	});

	// Cleanup after all tests
	afterAll(async () => {
		await prisma.report.deleteMany({});
		await prisma.program.deleteMany({});
		await prisma.user.deleteMany({});
	});

	describe('POST /api/reports', () => {
		it('should create a new report when authenticated as a researcher', async () => {
			const reportData = {
				programId: testProgram.id,
				title: 'New Vulnerability Report',
				description: 'This is a vulnerability report created during integration tests'
			};

			const response = await api
				.post('/api/reports')
				.set('Authorization', `Bearer ${researcherToken}`)
				.send(reportData)
				.expect(StatusCodes.CREATED);

			// Verify response
			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('title', reportData.title);
			expect(response.body).toHaveProperty('description', reportData.description);
			expect(response.body).toHaveProperty('programId', testProgram.id);
			expect(response.body).toHaveProperty('researcherId', researcherUser.id);

			// Verify database
			const dbReport = await prisma.report.findUnique({
				where: { id: response.body.id }
			});
			expect(dbReport).not.toBeNull();
			expect(dbReport.title).toBe(reportData.title);
		});

		it('should return 401 when not authenticated', async () => {
			const reportData = {
				programId: testProgram.id,
				title: 'Unauthorized Report',
				description: 'This report should not be created'
			};

			await api
				.post('/api/reports')
				.send(reportData)
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 403 when authenticated as a company', async () => {
			const reportData = {
				programId: testProgram.id,
				title: 'Forbidden Report',
				description: 'This report should not be created'
			};

			await api
				.post('/api/reports')
				.set('Authorization', `Bearer ${companyToken}`)
				.send(reportData)
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 400 when required fields are missing', async () => {
			// Missing programId
			await api
				.post('/api/reports')
				.set('Authorization', `Bearer ${researcherToken}`)
				.send({
					title: 'Missing Program ID',
					description: 'This report is missing programId'
				})
				.expect(StatusCodes.BAD_REQUEST);

			// Missing title
			await api
				.post('/api/reports')
				.set('Authorization', `Bearer ${researcherToken}`)
				.send({
					programId: testProgram.id,
					description: 'This report is missing title'
				})
				.expect(StatusCodes.BAD_REQUEST);
		});

		it('should return 404 when program does not exist', async () => {
			await api
				.post('/api/reports')
				.set('Authorization', `Bearer ${researcherToken}`)
				.send({
					programId: 'nonexistent-program',
					title: 'Report for Non-existent Program',
					description: 'This report references a non-existent program'
				})
				.expect(StatusCodes.NOT_FOUND);
		});
	});

	describe('GET /api/reports/program/:programId', () => {
		beforeEach(async () => {
			// Create a few more reports for testing
			await createTestReport(testProgram.id, researcherUser.id);
			await createTestReport(testProgram.id, researcherUser.id);
		});

		it('should return all program reports when authenticated as the owning company', async () => {
			const response = await api
				.get(`/api/reports/program/${testProgram.id}`)
				.set('Authorization', `Bearer ${companyToken}`)
				.expect(StatusCodes.OK);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThan(0);

			// All reports should be for this program
			response.body.forEach(report => {
				expect(report.programId).toBe(testProgram.id);
			});
		});

		it('should return only researcher\'s reports when authenticated as researcher', async () => {
			// Create another researcher with a report
			const anotherResearcherData = generateTestUser('RESEARCHER');
			const anotherResearcherResponse = await api
				.post('/api/auth/register')
				.send(anotherResearcherData);
			const anotherResearcherToken = anotherResearcherResponse.body.token;
			const anotherResearcherUser = anotherResearcherResponse.body.user;

			// Create a report for the other researcher
			await createTestReport(testProgram.id, anotherResearcherUser.id);

			// Get reports as original researcher
			const response = await api
				.get(`/api/reports/program/${testProgram.id}`)
				.set('Authorization', `Bearer ${researcherToken}`)
				.expect(StatusCodes.OK);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThan(0);

			// All reports should be for this program AND this researcher
			response.body.forEach(report => {
				expect(report.programId).toBe(testProgram.id);
				expect(report.researcherId).toBe(researcherUser.id);
			});

			// Should not include other researcher's reports
			const otherResearcherReports = response.body.filter(
				report => report.researcherId === anotherResearcherUser.id
			);
			expect(otherResearcherReports.length).toBe(0);
		});

		it('should return 401 when not authenticated', async () => {
			await api
				.get(`/api/reports/program/${testProgram.id}`)
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 403 when company tries to access another company\'s program', async () => {
			// Create another company user
			const anotherCompanyData = generateTestUser('COMPANY');
			const anotherCompanyResponse = await api
				.post('/api/auth/register')
				.send(anotherCompanyData);
			const anotherCompanyToken = anotherCompanyResponse.body.token;

			await api
				.get(`/api/reports/program/${testProgram.id}`)
				.set('Authorization', `Bearer ${anotherCompanyToken}`)
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 404 when program does not exist', async () => {
			await api
				.get('/api/reports/program/nonexistent-program')
				.set('Authorization', `Bearer ${companyToken}`)
				.expect(StatusCodes.NOT_FOUND);
		});
	});

	describe('GET /api/reports/:id', () => {
		it('should return a report when authenticated as submitting researcher', async () => {
			const response = await api
				.get(`/api/reports/${testReport.id}`)
				.set('Authorization', `Bearer ${researcherToken}`)
				.expect(StatusCodes.OK);

			expect(response.body).toHaveProperty('id', testReport.id);
			expect(response.body).toHaveProperty('title', testReport.title);
			expect(response.body).toHaveProperty('researcherId', researcherUser.id);
		});

		it('should return a report when authenticated as program-owning company', async () => {
			const response = await api
				.get(`/api/reports/${testReport.id}`)
				.set('Authorization', `Bearer ${companyToken}`)
				.expect(StatusCodes.OK);

			expect(response.body).toHaveProperty('id', testReport.id);
			expect(response.body).toHaveProperty('title', testReport.title);
		});

		it('should return 401 when not authenticated', async () => {
			await api
				.get(`/api/reports/${testReport.id}`)
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 403 when authenticated as a different researcher', async () => {
			// Create another researcher user
			const anotherResearcherData = generateTestUser('RESEARCHER');
			const anotherResearcherResponse = await api
				.post('/api/auth/register')
				.send(anotherResearcherData);
			const anotherResearcherToken = anotherResearcherResponse.body.token;

			await api
				.get(`/api/reports/${testReport.id}`)
				.set('Authorization', `Bearer ${anotherResearcherToken}`)
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
				.get(`/api/reports/${testReport.id}`)
				.set('Authorization', `Bearer ${anotherCompanyToken}`)
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 404 when report does not exist', async () => {
			await api
				.get('/api/reports/nonexistent-report')
				.set('Authorization', `Bearer ${companyToken}`)
				.expect(StatusCodes.NOT_FOUND);
		});
	});

	describe('PATCH /api/reports/:id/status', () => {
		it('should update report status when authenticated as program-owning company', async () => {
			const updateData = {
				status: 'IN_REVIEW'
			};

			const response = await api
				.patch(`/api/reports/${testReport.id}/status`)
				.set('Authorization', `Bearer ${companyToken}`)
				.send(updateData)
				.expect(StatusCodes.OK);

			expect(response.body).toHaveProperty('id', testReport.id);
			expect(response.body).toHaveProperty('status', updateData.status);

			// Verify database update
			const dbReport = await prisma.report.findUnique({
				where: { id: testReport.id }
			});
			expect(dbReport.status).toBe(updateData.status);
		});

		it('should update report severity when authenticated as program-owning company', async () => {
			const updateData = {
				severity: 'HIGH'
			};

			const response = await api
				.patch(`/api/reports/${testReport.id}/status`)
				.set('Authorization', `Bearer ${companyToken}`)
				.send(updateData)
				.expect(StatusCodes.OK);

			expect(response.body).toHaveProperty('id', testReport.id);
			expect(response.body).toHaveProperty('severity', updateData.severity);

			// Verify database update
			const dbReport = await prisma.report.findUnique({
				where: { id: testReport.id }
			});
			expect(dbReport.severity).toBe(updateData.severity);
		});

		it('should return 400 when both status and severity are missing', async () => {
			await api
				.patch(`/api/reports/${testReport.id}/status`)
				.set('Authorization', `Bearer ${companyToken}`)
				.send({})
				.expect(StatusCodes.BAD_REQUEST);
		});

		it('should return 401 when not authenticated', async () => {
			await api
				.patch(`/api/reports/${testReport.id}/status`)
				.send({ status: 'RESOLVED' })
				.expect(StatusCodes.UNAUTHORIZED);
		});

		it('should return 403 when authenticated as researcher', async () => {
			await api
				.patch(`/api/reports/${testReport.id}/status`)
				.set('Authorization', `Bearer ${researcherToken}`)
				.send({ status: 'RESOLVED' })
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
				.patch(`/api/reports/${testReport.id}/status`)
				.set('Authorization', `Bearer ${anotherCompanyToken}`)
				.send({ status: 'RESOLVED' })
				.expect(StatusCodes.FORBIDDEN);
		});

		it('should return 404 when report does not exist', async () => {
			await api
				.patch('/api/reports/nonexistent-report/status')
				.set('Authorization', `Bearer ${companyToken}`)
				.send({ status: 'RESOLVED' })
				.expect(StatusCodes.NOT_FOUND);
		});
	});
});