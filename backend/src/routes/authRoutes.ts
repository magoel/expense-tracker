import express from 'express';
import { authController } from '../controllers/authController';
import { validateRequestBody } from '../middleware/authMiddleware';
import { authMiddleware } from '../config/passport';
import * as joi from 'joi';

export const authRouter = express.Router();

// Validation schemas
const registerSchema = joi.object({
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
});

const loginSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
});

const updateProfileSchema = joi.object({
  firstName: joi.string(),
  lastName: joi.string(),
});

const changePasswordSchema = joi.object({
  currentPassword: joi.string().required(),
  newPassword: joi.string().min(6).required(),
});

// Routes
// Register new user
authRouter.post('/register', validateRequestBody(registerSchema), authController.register);

// Login user
authRouter.post('/login', validateRequestBody(loginSchema), authController.login);

// Google OAuth routes
authRouter.get('/google', authMiddleware.google);
authRouter.get('/google/callback', authMiddleware.googleCallback, authController.googleCallback);

// Protected routes
authRouter.get('/me', authMiddleware.jwt, authController.getCurrentUser);
authRouter.put('/profile', authMiddleware.jwt, validateRequestBody(updateProfileSchema), authController.updateProfile);
authRouter.post('/change-password', authMiddleware.jwt, validateRequestBody(changePasswordSchema), authController.changePassword);
