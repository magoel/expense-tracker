import promClient from 'prom-client';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export const setupPrometheus = () => {
  // Create a Registry to register the metrics
  const register = new promClient.Registry();
  
  // Add default metrics (e.g. CPU, memory usage)
  promClient.collectDefaultMetrics({
    register,
    prefix: 'expense_tracker_',
  });

  // HTTP request counter
  const httpRequestCounter = new promClient.Counter({
    name: 'expense_tracker_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  // HTTP request duration
  const httpRequestDurationHistogram = new promClient.Histogram({
    name: 'expense_tracker_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register],
  });

  // Active database connections
  const dbConnectionGauge = new promClient.Gauge({
    name: 'expense_tracker_db_connections_active',
    help: 'Number of active database connections',
    registers: [register],
  });

  // Database query duration
  const dbQueryDurationHistogram = new promClient.Histogram({
    name: 'expense_tracker_db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
  });

  // Middleware to collect metrics
  const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Record the request when it completes
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const route = req.route ? req.route.path : req.path;
      
      // Record metrics
      httpRequestCounter.inc({ 
        method: req.method, 
        route: route, 
        status_code: res.statusCode 
      });
      
      httpRequestDurationHistogram.observe(
        { method: req.method, route: route, status_code: res.statusCode },
        duration
      );
    });
    
    next();
  };

  // Endpoint to expose metrics for Prometheus to scrape
  const metricsRoute = (app: Express) => {
    app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (err) {
        logger.error('Error generating metrics:', err);
        res.status(500).end();
      }
    });
  };

  return {
    register,
    httpRequestCounter,
    httpRequestDurationHistogram,
    dbConnectionGauge,
    dbQueryDurationHistogram,
    metricsMiddleware,
    metricsRoute,
  };
};
