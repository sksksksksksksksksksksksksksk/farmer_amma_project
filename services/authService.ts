
import { UserProfile, UserRole } from '../types';

const AUTH_KEY = 'agrichain_auth_session';
const USERS_DB_KEY = 'agrichain_users_db';

export const authService = {
  getUsers: (): UserProfile[] => {
    const data = localStorage.getItem(USERS_DB_KEY);
    return data ? JSON.parse(data) : [];
  },

  getCurrentUser: (): UserProfile | null => {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  },

  signup: async (name: string, email: string, role: UserRole): Promise<UserProfile> => {
    // Artificial delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const users = authService.getUsers();
    if (users.find(u => u.email === email)) {
      throw new Error("A user with this email already exists.");
    }

    const newUser: UserProfile = {
      uid: Math.random().toString(36).substr(2, 9),
      email,
      role,
      name,
    };

    users.push(newUser);
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
    return newUser;
  },

  login: async (email: string, role: UserRole): Promise<UserProfile> => {
    // Artificial delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users = authService.getUsers();
    let user = users.find(u => u.email === email && u.role === role);
    
    // For this demo, if user doesn't exist, we'll auto-create or throw. 
    // To satisfy the "new user creating" request, we should favor the signup flow.
    if (!user) {
      throw new Error("User not found. Please create an account first.");
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
  }
};
