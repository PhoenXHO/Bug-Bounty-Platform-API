export default {
	transform: {
		'^.+\\.js$': 'babel-jest',
	},
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	testEnvironment: 'node',
	verbose: true,
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coveragePathIgnorePatterns: ['/node_modules/'],
	testMatch: ['**/tests/**/*.test.js'],
};