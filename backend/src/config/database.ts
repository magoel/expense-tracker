import { Sequelize } from 'sequelize';
import { logger } from './logger';

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/expense_tracker';

export const sequelize = new Sequelize(dbUrl, {
  logging: (msg) => logger.debug(msg),
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { 
      require: true, 
      rejectUnauthorized: false 
    } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export const setupDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    
    // Sync models with database in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized.');
    }
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
    throw err;
  }
};

export const getSequelize = (): Sequelize => {
  if (!sequelize) {
    throw new Error('Database not initialized. Call setupDatabase first.');
  }
  return sequelize;
};

export const syncDatabase = async (force = false): Promise<void> => {
  if (!sequelize) {
    throw new Error('Database not initialized. Call setupDatabase first.');
  }
  
  try {
    await sequelize.sync({ force });
    logger.info(`Database ${force ? 'force ' : ''}synced`);
  } catch (error) {
    logger.error('Failed to sync database:', error);
    throw error;
  }
};
