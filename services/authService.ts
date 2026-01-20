
import { auth } from './firebase';
import { supabase } from './supabase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { UserProfile, UserRole } from '../types';

const AUTH_KEY = 'agrichain_auth_session';

export const authService = {
  getCurrentUser: (): UserProfile | null => {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  },

  signup: async (name: string, email: string, role: UserRole): Promise<UserProfile> => {
    const password = "agrichain_secure_node_123"; 
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Sync with Supabase Profiles
      // CRITICAL: Ensure the 'profiles' table in Supabase has 'id' set to type 'TEXT', not 'UUID'.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: firebaseUser.uid,
          email: email,
          role: role,
          name: name
        });

      if (profileError) {
        console.error("Supabase Profile Sync Detail:", profileError);
        throw new Error(profileError.message || "Failed to sync profile to database. Check if table exists.");
      }

      const newUser: UserProfile = {
        uid: firebaseUser.uid,
        email,
        role,
        name,
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
      return newUser;
    } catch (err: any) {
      console.error("Signup Error:", err);
      throw err;
    }
  },

  login: async (email: string, role: UserRole): Promise<UserProfile> => {
    const password = "agrichain_secure_node_123"; 
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch role and name from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firebaseUser.uid)
        .eq('role', role)
        .single();
      
      if (profileError || !profile) {
        console.error("Supabase Login Fetch Error:", profileError);
        await signOut(auth);
        throw new Error(profileError?.message || "Access Denied: Role not found in decentralized registry.");
      }

      const user: UserProfile = {
        uid: firebaseUser.uid,
        email: profile.email,
        role: profile.role,
        name: profile.name,
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      return user;
    } catch (err: any) {
      console.error("Login Error:", err);
      throw err;
    }
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem(AUTH_KEY);
  }
};
