import dotenv from 'dotenv';
dotenv.config();

import app, { setupSwagger } from './server.js';

const PORT = process.env.PORT || 8080;

// Swagger setup
if (process.env.NODE_ENV !== 'test') {
	import('../docs/swagger.js').then(module => {
		const swaggerDocument = module.default;
		setupSwagger(swaggerDocument);
	});
}

// Start the server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
}