import express from 'express';
import { groupController } from '../controllers/groupController';
import { validateRequestBody, isGroupMember } from '../middleware/authMiddleware';
import { authMiddleware } from '../config/passport';
import * as joi from 'joi';

export const groupRouter = express.Router();

// Validation schemas
const createGroupSchema = joi.object({
  name: joi.string().required(),
  description: joi.string().allow('').optional(),
  currency: joi.string().length(3).optional(),
});

const joinGroupSchema = joi.object({
  code: joi.string().required(),
});

const processJoinRequestSchema = joi.object({
  action: joi.string().valid('approve', 'reject').required(),
});

const updateGroupSchema = joi.object({
  name: joi.string(),
  description: joi.string().allow(''),
});

// All group routes require authentication
groupRouter.use(authMiddleware.jwt);

// Routes
// Create a new group
groupRouter.post('/', validateRequestBody(createGroupSchema), groupController.createGroup);

// Get all user groups
groupRouter.get('/', groupController.getUserGroups);

// Get pending join requests for user's groups
groupRouter.get('/pending-requests', groupController.getPendingRequests);

// Join a group with a code
groupRouter.post('/join', validateRequestBody(joinGroupSchema), groupController.joinGroup);

// Process a join request (approve/reject)
groupRouter.patch('/memberships/:membershipId', validateRequestBody(processJoinRequestSchema), groupController.processJoinRequest);

// Get a single group
groupRouter.get('/:groupId', isGroupMember, groupController.getGroupDetails);

// Update a group
groupRouter.put('/:groupId', isGroupMember, validateRequestBody(updateGroupSchema), groupController.updateGroup);

// Remove a member from a group
groupRouter.delete('/:groupId/members/:memberId', isGroupMember, groupController.removeMember);

// Leave a group
groupRouter.post('/:groupId/leave', isGroupMember, groupController.leaveGroup);
