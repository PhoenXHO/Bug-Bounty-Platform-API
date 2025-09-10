import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import router from './routes/auth.js';
import swaggerUi from 'swagger-ui-express';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Swagger setup
import swaggerDocument from '../docs/swagger.js';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}]  ${req.method} ${req.url}`);
	next();
});

app.get('/', (req, res) => {
	res.json({ message: 'Welcome to the Bug Bounty Platform API!' });
});

app.use('/auth', router);

// Global error handler (should be added after all routes)
app.use(errorHandler);

// Start the server
app.listen(process.env.PORT, () => {
	console.log(`Server is running on port ${process.env.PORT}`);
});
