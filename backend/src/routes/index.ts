import { Express } from 'express';
import { authRouter } from './authRoutes';
import { groupRouter } from './groupRoutes';
import { expenseRouter } from './expenseRoutes';
import { paymentRouter } from './paymentRoutes';
import { statsRouter } from './statsRoutes';
import { notFoundHandler } from '../middleware/errorHandler';
import { setupPrometheus } from '../config/prometheus';

export const setupRoutes = (app: Express): void => {
  // API version prefix
  const apiPrefix = '/api';
  
  // Setup metrics routes
  const { metricsRoute } = setupPrometheus();
  metricsRoute(app);
  
  // Health check endpoint
  app.get('/health', (_, res) => res.status(200).json({ status: 'ok' }));
  
  // API routes
  app.use(`${apiPrefix}/auth`, authRouter);
  app.use(`${apiPrefix}/groups`, groupRouter);
  app.use(`${apiPrefix}/expenses`, expenseRouter);
  app.use(`${apiPrefix}/payments`, paymentRouter);
  app.use(`${apiPrefix}/stats`, statsRouter);
  
  // Handle 404 for API routes
  app.use(`${apiPrefix}/*`, notFoundHandler);
};
