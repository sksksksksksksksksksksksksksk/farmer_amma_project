
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
      let firebaseUser;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // If already exists, attempt to login and then sync profile (Idempotent Signup)
          const loginRes = await signInWithEmailAndPassword(auth, email, password);
          firebaseUser = loginRes.user;
        } else {
          throw err;
        }
      }

      // Sync with Supabase Profiles (Upsert ensures we don't fail if record exists)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: firebaseUser.uid,
          email: email,
          role: role,
          name: name
        }, { onConflict: 'id' });

      if (profileError) {
        console.error("Supabase Profile Sync Detail:", profileError);
        throw new Error("Registry synchronization failed. Please check your connection.");
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
      throw new Error(err.message || "Protocol identity creation failed.");
    }
  },

  login: async (email: string, role: UserRole): Promise<UserProfile> => {
    const password = "agrichain_secure_node_123"; 
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch profile to verify role
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firebaseUser.uid);
      
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
      
      if (profileError || !profile) {
        await signOut(auth);
        throw new Error("Node identity not found in the global registry.");
      }

      // Explicit role check to satisfy security requirement
      if (profile.role !== role) {
        await signOut(auth);
        throw new Error(`Permission Denied: Identity exists but as a ${profile.role} node, not ${role}.`);
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        throw new Error("Invalid credentials or node not registered.");
      }
      throw err;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem(AUTH_KEY);
  }
};
