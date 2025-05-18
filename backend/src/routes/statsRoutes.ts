import express from 'express';
import { statsController } from '../controllers/statsController';
import { isGroupMember } from '../middleware/authMiddleware';
import { authMiddleware } from '../config/passport';

export const statsRouter = express.Router();

// All stats routes require authentication
statsRouter.use(authMiddleware.jwt);

// Routes
// Get expense summary for a group
statsRouter.get('/group/:groupId/expenses', isGroupMember, statsController.getGroupExpenseSummary);

// Get balances for all users in a group
statsRouter.get('/group/:groupId/balances', isGroupMember, statsController.getGroupBalances);

// Get payment suggestions to settle debts
statsRouter.get('/group/:groupId/payment-suggestions', isGroupMember, statsController.getPaymentSuggestions);
