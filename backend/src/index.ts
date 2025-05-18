import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { configurePassport } from './config/passport';
import { setupPrometheus } from './config/prometheus';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupDatabase } from './config/database';
import { setupRedis } from './config/redis';
import { logger } from './config/logger';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Setup Prometheus metrics
const { metricsMiddleware } = setupPrometheus();
app.use(metricsMiddleware);

// Setup Passport authentication
configurePassport(app);

// Setup database connection
setupDatabase();

// Setup Redis connection
setupRedis();

// Setup routes
setupRoutes(app);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
