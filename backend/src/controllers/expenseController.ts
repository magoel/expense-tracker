import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Expense, ExpenseShare, User, Group } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { sequelize } from '../config/database';

// Helper function to check authentication and return user ID
const getUserId = (req: Request): number => {
  if (!req.user) {
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return (req.user as any).id;
};

export const expenseController = {
  // Create a new expense
  createExpense: asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { groupId, amount, description, date, shares } = req.body;
    
    // Start a transaction
    const t = await sequelize.transaction();
    
    try {
      // Create expense
      const expense = await Expense.create(
        {
          groupId,
          paidById: userId,
          amount,
          description,
          date: new Date(date),
        },
        { transaction: t }
      );

      // Validate shares are provided and sum equals expense amount
      if (!shares || Object.keys(shares).length === 0) {
        throw new Error('No shares provided. Please specify how the expense is split.');
      }
      
      const sharesTotal = Object.values(shares).reduce((sum: number, share: any) => sum + parseFloat(share), 0);
      if (Math.abs(sharesTotal - parseFloat(amount)) > 0.01) {
        throw new Error(`The sum of shares (${sharesTotal}) must equal the expense amount (${amount})`);
      }
      
      // Create expense shares
      const expenseShares = await Promise.all(
        Object.entries(shares).map(([shareUserId, shareAmount]) => {
          return ExpenseShare.create(
            {
              expenseId: expense.id,
              userId: parseInt(shareUserId),
              amount: parseFloat(shareAmount as string),
              isPaid: parseInt(shareUserId) === userId, // Mark as paid if the user paid their own share
            },
            { transaction: t }
          );
        })
      );
      
      await t.commit();
      
      logger.info(`New expense created: ${amount} in group #${groupId} by user #${userId}`);
      
      res.status(201).json({
        success: true,
        data: {
          expense,
          shares: expenseShares,
        },
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }),
  
  // Upload receipt for expense
  uploadReceipt: asyncHandler(async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    const userId = getUserId(req);
    
    if (!req.file) {
      const error: any = new Error('No file uploaded');
      error.status = 400;
      throw error;
    }
    
    // Find the expense
    const expense = await Expense.findByPk(expenseId);
    
    if (!expense) {
      const error: any = new Error('Expense not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user created this expense
    if (expense.paidById !== userId) {
      const error: any = new Error('Not authorized to update this expense');
      error.status = 403;
      throw error;
    }
    
    // Update receipt URL (assuming file is saved and URL is in req.file.path)
    const receiptUrl = `/uploads/${req.file.filename}`;
    expense.receiptUrl = receiptUrl;
    await expense.save();
    
    res.status(200).json({
      success: true,
      data: {
        receiptUrl,
      },
    });
  }),
  
  // Get expenses for a group
  getGroupExpenses: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // Get expenses with shares
    const { count, rows } = await Expense.findAndCountAll({
      where: { groupId },
      include: [
        {
          model: User,
          as: 'paidBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: ExpenseShare,
          as: 'shares',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
      limit,
      offset,
    });
    
    res.status(200).json({
      success: true,
      data: {
        expenses: rows,
        pagination: {
          totalCount: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit,
        },
      },
    });
  }),
  
  // Get expense details
  getExpenseDetails: asyncHandler(async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    
    // Find expense with shares
    const expense = await Expense.findByPk(expenseId, {
      include: [
        {
          model: User,
          as: 'paidBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: ExpenseShare,
          as: 'shares',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
            },
          ],
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'currency'],
        },
      ],
    });
    
    if (!expense) {
      const error: any = new Error('Expense not found');
      error.status = 404;
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: {
        expense,
      },
    });
  }),
  
  // Update an expense
  updateExpense: asyncHandler(async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    const userId = getUserId(req);
    const { description, date } = req.body;
    
    // Find expense
    const expense = await Expense.findByPk(expenseId);
    
    if (!expense) {
      const error: any = new Error('Expense not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user created this expense
    if (expense.paidById !== userId) {
      const error: any = new Error('Not authorized to update this expense');
      error.status = 403;
      throw error;
    }
    
    // Update fields
    if (description) expense.description = description;
    if (date) expense.date = new Date(date);
    
    await expense.save();
    
    res.status(200).json({
      success: true,
      data: {
        expense,
      },
    });
  }),
  
  // Delete an expense
  deleteExpense: asyncHandler(async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    const userId = getUserId(req);
    
    // Find expense
    const expense = await Expense.findByPk(expenseId);
    
    if (!expense) {
      const error: any = new Error('Expense not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user created this expense
    if (expense.paidById !== userId) {
      const error: any = new Error('Not authorized to delete this expense');
      error.status = 403;
      throw error;
    }
    
    // Start a transaction
    const t = await sequelize.transaction();
    
    try {
      // Delete related shares first
      await ExpenseShare.destroy({
        where: { expenseId },
        transaction: t,
      });
      
      // Delete the expense
      await expense.destroy({ transaction: t });
      
      await t.commit();
      
      logger.info(`Expense #${expenseId} deleted by user #${userId}`);
      
      res.status(200).json({
        success: true,
        message: 'Expense deleted successfully',
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }),
  
  // Mark expense share as paid
  markSharePaid: asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;
    
    // Find the expense share
    const share = await ExpenseShare.findByPk(shareId);
    
    if (!share) {
      const error: any = new Error('Expense share not found');
      error.status = 404;
      throw error;
    }
    
    // Update share status
    share.isPaid = true;
    share.paidAt = new Date();
    await share.save();
    
    res.status(200).json({
      success: true,
      data: {
        share,
      },
    });
  }),
};
