import { Request, Response } from 'express';
import { Payment, User, ExpenseShare, Group, GroupMember } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';

// Helper function to check authentication and return user ID
const getUserId = (req: Request): number => {
  if (!req.user) {
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return (req.user as any).id;
};

export const paymentController = {
  // Record a new payment
  createPayment: asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { groupId, receiverId, payerId, amount, description, date, expenseShareIds = [] } = req.body;
    
    // Verify the user is a member of the group
    const userMembership = await Group.findOne({
      where: { id: groupId },
      include: [
        {
          model: GroupMember,
          as: 'memberships',
          where: { userId },
          required: true
        }
      ]
    });
    
    if (!userMembership) {
      const error: any = new Error('You are not a member of this group');
      error.status = 403;
      throw error;
    }
    
    // Check if the payerId is provided, if not, use the current user ID
    const actualPayerId = payerId || userId;
    
    // Verify payer and receiver are members of the group
    const groupMembers = await GroupMember.findAll({
      where: { 
        groupId,
        userId: {
          [Op.in]: [actualPayerId, receiverId]
        }
      }
    });
    
    // Check if both users are members of the group
    const payerIsMember = groupMembers.some((m: any) => m.userId === actualPayerId);
    const receiverIsMember = groupMembers.some((m: any) => m.userId === receiverId);
    
    if (!payerIsMember || !receiverIsMember) {
      const error: any = new Error('Both payer and receiver must be members of the group');
      error.status = 400;
      throw error;
    }
    
    // Start a transaction
    const t = await sequelize.transaction();
    
    try {
      // Create payment
      const payment = await Payment.create(
        {
          groupId,
          payerId: actualPayerId,
          receiverId,
          amount,
          description,
          date: new Date(date),
        },
        { transaction: t }
      );
      
      // If expense shares are provided, mark them as paid
      if (expenseShareIds.length > 0) {
        await ExpenseShare.update(
          {
            isPaid: true,
            paidAt: new Date(),
          },
          {
            where: {
              id: { [Op.in]: expenseShareIds },
              userId: userId,
            },
            transaction: t,
          }
        );
      }
      
      await t.commit();
      
      logger.info(`New payment created: ${amount} from user #${userId} to user #${receiverId} in group #${groupId}`);
      
      res.status(201).json({
        success: true,
        data: {
          payment,
        },
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }),
  
  // Get all payments in a group
  getGroupPayments: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    
    // Get all payments with user details
    const payments = await Payment.findAll({
      where: { groupId },
      include: [
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
      order: [['date', 'DESC']],
    });
    
    res.status(200).json({
      success: true,
      data: {
        payments,
      },
    });
  }),
  
  // Get payments for a specific user in a group
  getUserPayments: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const userId = getUserId(req);
    
    // Get payments either sent or received by the user
    const payments = await Payment.findAll({
      where: {
        groupId,
        [Op.or]: [
          { payerId: userId },
          { receiverId: userId },
        ],
      },
      include: [
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
      ],
      order: [['date', 'DESC']],
    });
    
    res.status(200).json({
      success: true,
      data: {
        payments,
      },
    });
  }),
  
  // Update a payment
  updatePayment: asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const userId = getUserId(req);
    const { amount, description, date } = req.body;
    
    // Find payment
    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      const error: any = new Error('Payment not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user is a member of the group
    const isMember = await GroupMember.findOne({
      where: {
        groupId: payment.groupId,
        userId
      }
    });
    
    if (!isMember) {
      const error: any = new Error('Not authorized to update this payment');
      error.status = 403;
      throw error;
    }
    
    // If not the original payer, check if within 7 days
    if (payment.payerId !== userId) {
      // Calculate the difference in days between current date and payment creation date
      const daysDifference = Math.floor((Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 7) {
        const error: any = new Error('Payments can only be edited within 7 days of creation');
        error.status = 403;
        throw error;
      }
    }
    
    // Update fields
    if (amount !== undefined) payment.amount = amount;
    if (description !== undefined) payment.description = description;
    if (date) payment.date = new Date(date);
    
    await payment.save();
    
    logger.info(`Payment #${paymentId} updated by user #${userId} (${payment.payerId === userId ? 'creator' : 'group member'})`);
    
    res.status(200).json({
      success: true,
      data: {
        payment,
      },
    });
  }),
  
  // Delete a payment
  deletePayment: asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const userId = getUserId(req);
    
    // Find payment
    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      const error: any = new Error('Payment not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user is a member of the group
    const isMember = await GroupMember.findOne({
      where: {
        groupId: payment.groupId,
        userId
      }
    });
    
    if (!isMember) {
      const error: any = new Error('Not authorized to delete this payment');
      error.status = 403;
      throw error;
    }
    
    // If not the original payer, check if within 7 days
    if (payment.payerId !== userId) {
      // Calculate the difference in days between current date and payment creation date
      const daysDifference = Math.floor((Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 7) {
        const error: any = new Error('Payments can only be deleted within 7 days of creation');
        error.status = 403;
        throw error;
      }
    }
    
    // Delete the payment
    await payment.destroy();
    
    logger.info(`Payment #${paymentId} deleted by user #${userId} (${payment.payerId === userId ? 'creator' : 'group member'})`);
    
    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
    });
  }),
  
  // Get recent payments for the current user across all groups
  getRecentUserPayments: asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;
    
    // Prepare search condition for description if search term exists
    const searchCondition = search 
      ? { description: { [Op.iLike]: `%${search}%` } } 
      : {};
    
    // Find payments where user is either the payer or the receiver
    const payments = await Payment.findAndCountAll({
      where: {
        ...searchCondition,
        [Op.or]: [
          { payerId: userId },
          { receiverId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'currency'],
        },
      ],
      order: [['date', 'DESC']],
      limit,
      offset,
    });
    
    res.status(200).json({
      success: true,
      data: {
        payments: payments.rows,
        pagination: {
          totalCount: payments.count,
          totalPages: Math.ceil(payments.count / limit),
          currentPage: page,
          limit,
        },
      },
    });
  }),
};
