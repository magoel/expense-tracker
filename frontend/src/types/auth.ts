export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  authProvider?: 'local' | 'google' | string;
  groupCount?: number;
  expenseCount?: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    message: string;
    path: string[];
  }>;
}
