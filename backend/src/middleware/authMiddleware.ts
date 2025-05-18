import { Request, Response, NextFunction } from 'express';
import { User, GroupMember } from '../models';
import { asyncHandler } from './errorHandler';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const isAuthenticated = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const error: any = new Error('Not authenticated');
      error.status = 401;
      throw error;
    }
    next();
  }
);

export const isGroupMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const error: any = new Error('Not authenticated');
      error.status = 401;
      throw error;
    }

    const groupId = parseInt(req.params.groupId || req.body.groupId);
    
    if (!groupId) {
      const error: any = new Error('Group ID is required');
      error.status = 400;
      throw error;
    }

    const membership = await GroupMember.findOne({
      where: {
        userId: req.user.id,
        groupId,
        status: 'active'
      }
    });

    if (!membership) {
      const error: any = new Error('You are not a member of this group');
      error.status = 403;
      throw error;
    }

    next();
  }
);

export const validateRequestBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationError: any = new Error('Validation failed');
      validationError.status = 400;
      validationError.errors = error.details.map((detail: any) => ({
        message: detail.message,
        path: detail.path,
      }));
      return next(validationError);
    }
    next();
  };
};
