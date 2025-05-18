import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { logger } from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';

export const authController = {
  // Register a new user
  register: asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error: any = new Error('User already exists with this email');
      error.status = 400;
      throw error;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
      { expiresIn: '7d' }
    );
    
    logger.info(`New user registered: ${user.email}`);
    
    // Return user data and token
    res.status(201).json({
      success: true,
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  }),
  
  // Login user
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user || !user.passwordHash) {
      const error: any = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
      { expiresIn: '7d' }
    );
    
    logger.info(`User logged in: ${user.email}`);
    
    // Return user data and token
    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  }),
  
  // Google OAuth callback
  googleCallback: asyncHandler(async (req: Request, res: Response) => {
    // User is already attached to req.user by passport
    const user = req.user;
    
    if (!user) {
      return res.redirect('/login?error=auth_failed');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
      { expiresIn: '7d' }
    );
    
    logger.info(`User logged in via Google: ${user.email}`);
    
    // Redirect to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }),
  
  // Get current user
  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject(),
      },
    });
  }),
  
  // Update user profile
  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject(),
      },
    });
  }),
  
  // Change password
  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user || !user.passwordHash) {
      const error: any = new Error('User not found or no password set');
      error.status = 400;
      throw error;
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Current password is incorrect');
      error.status = 400;
      throw error;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordHash = passwordHash;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  }),
};
