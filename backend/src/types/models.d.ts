import { Group } from '../models';

// Add proper type definition for GroupMember with relations
declare global {
  namespace Models {
    interface GroupMemberWithRelations {
      id: number;
      userId: number;
      groupId: number;
      status: string;
      joinedAt?: Date;
      group?: any;
      user?: any;
      [key: string]: any;
    }
  }
}
