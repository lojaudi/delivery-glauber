import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isReseller: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReseller, setIsReseller] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkRoles(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsReseller(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkRoles(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRoles = async (userId: string) => {
    try {
      // Check if user is a reseller (highest priority)
      const { data: resellerData, error: resellerError } = await supabase
        .from('resellers')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (resellerError) {
        console.error('Error checking reseller role:', resellerError);
      }
      setIsReseller(!!resellerData);

      // If reseller, also set as admin (reseller has full access)
      if (resellerData) {
        setIsAdmin(true);
        return;
      }

      // Check if user is a restaurant admin
      const { data: restaurantAdminData, error: adminError } = await supabase
        .from('restaurant_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminError) {
        console.error('Error checking restaurant admin role:', adminError);
      }
      setIsAdmin(!!restaurantAdminData);
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsAdmin(false);
      setIsReseller(false);
    }
  };

  const refreshRole = async () => {
    if (!user) return;
    await checkRoles(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsReseller(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isAdmin, 
      isReseller, 
      refreshRole, 
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}