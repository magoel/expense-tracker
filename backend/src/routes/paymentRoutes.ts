import express from 'express';
import { paymentController } from '../controllers/paymentController';
import { validateRequestBody, isGroupMember } from '../middleware/authMiddleware';
import { authMiddleware } from '../config/passport';
import * as joi from 'joi';

export const paymentRouter = express.Router();

// Validation schemas
const createPaymentSchema = joi.object({
  groupId: joi.number().required(),
  receiverId: joi.number().required(),
  payerId: joi.number().optional(),  // Add payerId as an optional field
  amount: joi.number().positive().required(),
  description: joi.string().allow('').optional(),
  date: joi.date().required(),
  expenseShareIds: joi.array().items(joi.number()).optional(),
});

// All payment routes require authentication
paymentRouter.use(authMiddleware.jwt);

// Routes
// Record a new payment
paymentRouter.post('/', validateRequestBody(createPaymentSchema), paymentController.createPayment);

// Get all payments in a group
paymentRouter.get('/group/:groupId', isGroupMember, paymentController.getGroupPayments);

// Get payments for current user in a group
paymentRouter.get('/group/:groupId/user', isGroupMember, paymentController.getUserPayments);

// Get recent payments for user across all groups
paymentRouter.get('/recent', paymentController.getRecentUserPayments);

// Delete a payment
paymentRouter.delete('/:paymentId', paymentController.deletePayment);
