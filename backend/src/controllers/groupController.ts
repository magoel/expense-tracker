import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Group, User, GroupMember } from '../models';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Helper function to check authentication and return user ID
const getUserId = (req: Request): number => {
  if (!req.user) {
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return (req.user as any).id;
};

export const groupController = {
  // Create a new group
  createGroup: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, currency = 'USD' } = req.body;
    const userId = getUserId(req);
    
    // Create the group
    const group = await Group.create({
      name,
      description,
      currency,
      creatorId: userId,
    });
    
    // Add creator as a member (automatically approved)
    await GroupMember.create({
      userId,
      groupId: group.id,
      status: 'active',
      joinedAt: new Date(),
    });
    
    logger.info(`New group created: ${group.name} by user #${userId}`);
    
    res.status(201).json({
      success: true,
      data: {
        group,
      },
    });
  }),
  
  // Get all groups for the current user
  getUserGroups: asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    
    // Get all active memberships
    const memberships = await GroupMember.findAll({
      where: {
        userId,
        status: 'active',
      },
      include: [
        {
          model: Group,
          as: 'group',
        },
      ],
    });
    
    // Get groups with member count
    const rawGroups = memberships.map((membership) => (membership as any).group);
    
    // Get member count for each group
    const groupPromises = rawGroups.map(async (group) => {
      const memberCount = await GroupMember.count({
        where: {
          groupId: group.id,
          status: 'active'
        }
      });
      
      return {
        ...group.toJSON(),
        memberCount
      };
    });
    
    const groups = await Promise.all(groupPromises);
    
    res.status(200).json({
      success: true,
      data: {
        groups,
      },
    });
  }),
  
  // Get pending group join requests for groups created by user
  getPendingRequests: asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    
    // Find groups created by this user
    const userGroups = await Group.findAll({
      where: {
        creatorId: userId,
      },
    });
    
    const groupIds = userGroups.map((group) => group.id);
    
    // Get pending requests for these groups
    const pendingRequests = await GroupMember.findAll({
      where: {
        groupId: {
          [Op.in]: groupIds,
        },
        status: 'pending',
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name'],
        },
      ],
    });
    
    res.status(200).json({
      success: true,
      data: {
        pendingRequests,
      },
    });
  }),
  
  // Get single group details
  getGroupDetails: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    
    // Find group with members
    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: GroupMember,
          as: 'memberships',
          where: {
            status: 'active',
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
            },
          ],
        },
      ],
    });
    
    if (!group) {
      const error: any = new Error('Group not found');
      error.status = 404;
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: {
        group,
      },
    });
  }),
  
  // Join a group with code
  joinGroup: asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    const userId = getUserId(req);
    
    // Find group by code
    const group = await Group.findOne({
      where: { code },
    });
    
    if (!group) {
      const error: any = new Error('Invalid group code');
      error.status = 404;
      throw error;
    }
    
    // Check if user is already a member
    const existingMembership = await GroupMember.findOne({
      where: {
        userId,
        groupId: group.id,
      },
    });
    
    if (existingMembership) {
      if (existingMembership.status === 'active') {
        const error: any = new Error('You are already a member of this group');
        error.status = 400;
        throw error;
      }
      
      if (existingMembership.status === 'pending') {
        const error: any = new Error('Your request to join this group is pending');
        error.status = 400;
        throw error;
      }
      
      // If rejected before, update the status to pending
      existingMembership.status = 'pending';
      await existingMembership.save();
    } else {
      // Create new membership request
      await GroupMember.create({
        userId,
        groupId: group.id,
        status: 'pending',
      });
    }
    
    logger.info(`User #${userId} requested to join group #${group.id}`);
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Join request sent successfully',
        group: {
          id: group.id,
          name: group.name,
        },
      },
    });
  }),
  
  // Approve or reject a join request
  processJoinRequest: asyncHandler(async (req: Request, res: Response) => {
    const { membershipId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const userId = getUserId(req);
    
    // Find the membership
    const membership = await GroupMember.findByPk(membershipId, {
      include: [
        {
          model: Group,
          as: 'group',
        },
      ],
    });
    
    if (!membership || membership.status !== 'pending') {
      const error: any = new Error('Invalid membership request');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user is the group creator
    if ((membership as any).group.creatorId !== userId) {
      const error: any = new Error('Not authorized to process this request');
      error.status = 403;
      throw error;
    }
    
    // Process the request
    if (action === 'approve') {
      membership.status = 'active';
      membership.joinedAt = new Date();
      await membership.save();
      
      logger.info(`User #${membership.userId} approved to join group #${membership.groupId} by user #${userId}`);
      
      res.status(200).json({
        success: true,
        message: 'Member approved successfully',
      });
    } else if (action === 'reject') {
      membership.status = 'rejected';
      await membership.save();
      
      logger.info(`User #${membership.userId} rejected from joining group #${membership.groupId} by user #${userId}`);
      
      res.status(200).json({
        success: true,
        message: 'Member rejected successfully',
      });
    } else {
      const error: any = new Error('Invalid action');
      error.status = 400;
      throw error;
    }
  }),
  
  // Update group details
  updateGroup: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = getUserId(req);
    
    // Find the group
    const group = await Group.findByPk(groupId);
    
    if (!group) {
      const error: any = new Error('Group not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user is the group creator
    if (group.creatorId !== userId) {
      const error: any = new Error('Not authorized to update this group');
      error.status = 403;
      throw error;
    }
    
    // Update group
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    
    await group.save();
    
    res.status(200).json({
      success: true,
      data: {
        group,
      },
    });
  }),
  
  // Remove member from group
  removeMember: asyncHandler(async (req: Request, res: Response) => {
    const { groupId, memberId } = req.params;
    const userId = getUserId(req);
    
    // Find the group
    const group = await Group.findByPk(groupId);
    
    if (!group) {
      const error: any = new Error('Group not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the current user is the group creator
    if (group.creatorId !== userId) {
      const error: any = new Error('Not authorized to remove members from this group');
      error.status = 403;
      throw error;
    }
    
    // Prevent removing the creator
    if (parseInt(memberId) === group.creatorId) {
      const error: any = new Error('Cannot remove the group creator');
      error.status = 400;
      throw error;
    }
    
    // Find and delete the membership
    const deleted = await GroupMember.destroy({
      where: {
        groupId,
        userId: memberId,
      },
    });
    
    if (!deleted) {
      const error: any = new Error('Member not found in this group');
      error.status = 404;
      throw error;
    }
    
    logger.info(`User #${memberId} removed from group #${groupId} by user #${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  }),
  
  // Leave a group
  leaveGroup: asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const userId = getUserId(req);
    
    // Find the group
    const group = await Group.findByPk(groupId);
    
    if (!group) {
      const error: any = new Error('Group not found');
      error.status = 404;
      throw error;
    }
    
    // Check if the user is the creator
    if (group.creatorId === userId) {
      const error: any = new Error('Group creator cannot leave. Transfer ownership or delete the group instead');
      error.status = 400;
      throw error;
    }
    
    // Find and delete the membership
    const deleted = await GroupMember.destroy({
      where: {
        groupId,
        userId,
      },
    });
    
    if (!deleted) {
      const error: any = new Error('You are not a member of this group');
      error.status = 404;
      throw error;
    }
    
    logger.info(`User #${userId} left group #${groupId}`);
    
    res.status(200).json({
      success: true,
      message: 'Left group successfully',
    });
  }),
};
