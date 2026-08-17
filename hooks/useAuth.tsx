"use client";

/**
 * Authentication Context Hook
 * Client-side user state and auth operations
 * Used in layout.tsx and protected pages
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { mergeGuestCartAction } from "@/app/cart/actions";

// ===================================================================
// TYPES
// ===================================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: "customer" | "admin";
  emailVerified: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  updateProfile: (name: string, phone?: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

// ===================================================================
// CONTEXT & PROVIDER
// ===================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Failed to get session:", error);
          setIsLoading(false);
          return;
        }

        if (data.session?.user) {
          // Fetch user profile from public.users table
          const { data: userProfile, error: profileError } = await supabase
            .from("users")
            .select("id, email, name, phone, role, email_verified")
            .eq("id", data.session.user.id)
            .single();

          if (profileError) {
            console.error("Failed to fetch user profile:", profileError);
          } else {
            setUser({
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.name,
              phone: userProfile.phone,
              role: userProfile.role as "customer" | "admin",
              emailVerified: userProfile.email_verified,
            });
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // Merge guest cart before setting user (so useCart loads merged result)
          try {
            const stored = localStorage.getItem("mstore_cart_guest");
            if (stored) {
              const guestItems = JSON.parse(stored);
              if (Array.isArray(guestItems) && guestItems.length > 0) {
                await mergeGuestCartAction(session.user.id, guestItems);
                localStorage.removeItem("mstore_cart_guest");
              }
            }
          } catch (err) {
            console.error("Cart merge failed:", err);
            // Don't block login on cart merge failure
          }

          const { data: userProfile } = await supabase
            .from("users")
            .select("id, email, name, phone, role, email_verified")
            .eq("id", session.user.id)
            .single();

          if (userProfile) {
            setUser({
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.name,
              phone: userProfile.phone,
              role: userProfile.role as "customer" | "admin",
              emailVerified: userProfile.email_verified,
            });
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session?.user) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("id, email, name, phone, role, email_verified")
          .eq("id", data.session.user.id)
          .single();

        if (userProfile) {
          setUser({
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            phone: userProfile.phone,
            role: userProfile.role as "customer" | "admin",
            emailVerified: userProfile.email_verified,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to login";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to logout";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, phone?: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create user profile in public.users table
      const { error: profileError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email,
          name,
          phone,
          role: "customer",
          email_verified: false,
        });

      if (profileError) {
        throw new Error(profileError.message);
      }

      setUser({
        id: authData.user.id,
        email: authData.user.email || email,
        name,
        phone,
        role: "customer",
        emailVerified: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to signup";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (name: string, phone?: string) => {
    try {
      setError(null);

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase
        .from("users")
        .update({ name, phone })
        .eq("id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      setUser({ ...user, name, phone });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    signup,
    updateProfile,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===================================================================
// HOOK
// ===================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
