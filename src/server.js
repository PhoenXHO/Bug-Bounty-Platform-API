import express from 'express';
import swaggerUi from 'swagger-ui-express';

import authRouter from './routes/auth.js';
import programRouter from './routes/programs.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// --- Middleware ---
app.use(express.json());

//app.use((req, res, next) => {
//	console.log(`[${new Date().toISOString()}]  ${req.method} ${req.url}`);
//	next();
//});

// --- API Routes ---
app.get('/api', (req, res) => {
	res.json({ message: 'Welcome to the Bug Bounty Platform API!' });
});

app.use('/api/auth', authRouter);
app.use('/api/programs', programRouter);

// --- Swagger setup ---
export const setupSwagger = (swaggerDocument) => {
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

// --- Global Error Handler ---
app.use(errorHandler);

export default app;