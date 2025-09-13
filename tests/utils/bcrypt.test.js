import { hashPassword, comparePasswords } from '../../src/utils/bcrypt.js';

describe('bcrypt utility functions', () => {
	describe('hashPassword', () => {
		it('should hash a password', async () => {
			const password = 'testPassword123';
			const hashedPassword = await hashPassword(password);

			// Hash should be different from original password
			expect(hashedPassword).not.toBe(password);

			// Should be a bcrypt hash (starts with $2b$)
			expect(hashedPassword.startsWith('$2b$')).toBe(true);

			// Hash should be long enough (bcrypt hashes are typically 60 characters)
			expect(hashedPassword.length).toBeGreaterThanOrEqual(50);
		});

		it('should generate different hashes for the same password (due to salt)', async () => {
			const password = 'samePassword123';
			const hash1 = await hashPassword(password);
			const hash2 = await hashPassword(password);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('comparePasswords', () => {
		it('should return true for matching password and hash', async () => {
			const password = 'matchingPassword123';
			const hashedPassword = await hashPassword(password);

			const result = await comparePasswords(password, hashedPassword);
			expect(result).toBe(true);
		});

		it('should return false for non-matching password and hash', async () => {
			const password = 'originalPassword123';
			const wrongPassword = 'wrongPassword123';
			const hashedPassword = await hashPassword(password);

			const result = await comparePasswords(wrongPassword, hashedPassword);
			expect(result).toBe(false);
		});
	});
});