import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    selectedRole: AppRole,
    department?: string,
    rollNumber?: string,
    facultyId?: string,
    companyName?: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: selectedRole,
        }
      }
    });

    if (error) return { error };

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          full_name: fullName,
          email: email,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: selectedRole,
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      }

      // Create role-specific profile with department
      if (selectedRole === 'student') {
        await supabase.from('student_profiles').insert({ 
          user_id: data.user.id,
          department: department || null,
          roll_number: rollNumber || null
        });
      } else if (selectedRole === 'recruiter') {
        await supabase.from('recruiter_profiles').insert({ 
          user_id: data.user.id,
          company_name: companyName || 'My Company'
        });
      } else if (selectedRole === 'faculty') {
        await supabase.from('faculty_profiles').insert({ 
          user_id: data.user.id,
          department: department || null,
          employee_id: facultyId || null
        });
      }
    }

    return { data, error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  };

  const signOut = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      // If there's no active session, treat this as a successful logout and just clear local state.
      if (!currentSession) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        return { error: null };
      }

      const { error } = await supabase.auth.signOut();

      // Supabase can return a "session missing" style error if the client is already signed out.
      // In that case, also treat as success.
      if (error && typeof error?.message === 'string' && error.message.toLowerCase().includes('session')) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        return { error: null };
      }

      if (!error) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      }

      return { error };
    } catch (error) {
      // If anything unexpected happens, clear local auth state so the user is effectively logged out.
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      return { error };
    }
  };

  return {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    refetchUserData: () => user && fetchUserData(user.id),
  };
};
