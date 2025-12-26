import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth, UserProfile } from '@/hooks/useSupabaseAuth';
import { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, department?: string, rollNumber?: string, facultyId?: string, companyName?: string) => Promise<{ data?: any; error: any } | { data: any; error: null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  refetchUserData: () => void;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useSupabaseAuth();

  return (
    <SupabaseAuthContext.Provider value={auth}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuthContext = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuthContext must be used within a SupabaseAuthProvider');
  }
  return context;
};
