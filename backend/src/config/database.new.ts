import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/expense_tracker';

export const sequelize = new Sequelize(dbUrl, {
  logging: (msg: string) => logger.debug(msg),
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
