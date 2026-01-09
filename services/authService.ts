
import { UserProfile, UserRole } from '../types';

const AUTH_KEY = 'agrichain_auth';

export const authService = {
  getCurrentUser: (): UserProfile | null => {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  },

  login: async (email: string, role: UserRole): Promise<UserProfile> => {
    // Simulating Firebase Auth behavior
    const mockUser: UserProfile = {
      uid: Math.random().toString(36).substr(2, 9),
      email,
      role,
      name: email.split('@')[0].toUpperCase(),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
  }
};
