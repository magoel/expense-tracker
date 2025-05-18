import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient>;

export const setupRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    await redisClient.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call setupRedis first.');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.disconnect();
    logger.info('Redis connection closed');
  }
};
