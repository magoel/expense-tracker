import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Expense, ExpenseShare, User, Group, GroupMember } from '../models';
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
    const { groupId, amount, description, date, shares, paidById } = req.body;
    
    // Start a transaction
    const t = await sequelize.transaction();
    
    try {
      // Create expense
      const expense = await Expense.create(
        {
          groupId,
          paidById: paidById || userId, // Use provided paidById if available, otherwise current user
          amount,
          description,
          date: new Date(date),
        },
        { transaction: t }
      );

      // Validate shares sum equals expense amount
      const sharesTotal = Object.values(shares).reduce((sum: number, share: any) => sum + parseFloat(share), 0);
      if (Math.abs(sharesTotal - parseFloat(amount)) > 0.01) {
        throw new Error('The sum of shares must equal the expense amount');
      }
      
      // Create expense shares
      const expenseShares = await Promise.all(
        Object.entries(shares).map(([shareUserId, shareAmount]) => {
          return ExpenseShare.create(
            {
              expenseId: expense.id,
              userId: parseInt(shareUserId),
              amount: parseFloat(shareAmount as string),
              isPaid: parseInt(shareUserId) === expense.paidById, // Mark as paid if this user is the one who paid
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
    
    // Check if the current user is in the same group as the expense
    const isMember = await GroupMember.findOne({
      where: {
        groupId: expense.groupId,
        userId
      }
    });
    
    if (!isMember) {
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

  // Get recent expenses for the current user across all groups
  getRecentUserExpenses: asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;
    
    // Prepare search condition for description if search term exists
    const searchCondition = search 
      ? { description: { [Op.iLike]: `%${search}%` } } 
      : {};
    
    // First, get all expense IDs where the user has a share
    const userShareExpenseIds = await ExpenseShare.findAll({
      where: {
        userId
      },
      attributes: ['expenseId'],
      raw: true
    }).then(shares => shares.map(share => share.expenseId));
    
    // Find expenses: 
    // 1. Where user is the payer OR
    // 2. Where expense ID is in the list of expenses where user has a share
    const expenses = await Expense.findAndCountAll({
      where: {
        ...searchCondition,
        [Op.or]: [
          { paidById: userId },
          { id: { [Op.in]: userShareExpenseIds } }
        ]
      },
      include: [
        {
          model: User,
          as: 'paidBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'currency'],
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
      distinct: true,
    });
    
    res.status(200).json({
      success: true,
      data: {
        expenses: expenses.rows,
        pagination: {
          totalCount: expenses.count,
          totalPages: Math.ceil(expenses.count / limit),
          currentPage: page,
          limit,
        },
      },
    });
  }),
};
