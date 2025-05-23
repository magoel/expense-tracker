// This file extends Express Request types to include user information
declare global {
  namespace Express {
    // Augment the Express User interface
    interface User {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      passwordHash?: string;
      googleId?: string;
      avatarUrl?: string;
      toSafeObject(): any;
    }
  }
}
