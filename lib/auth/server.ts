/**
 * Authentication Helper Functions
 * Server-side auth operations: signup, login, password reset
 * Uses Supabase Auth which will be integrated in Step 5
 */

import { supabase, supabaseAdmin } from "@/lib/supabase/client";
import { SignUpSchema, LogInSchema, ResetPasswordSchema } from "@/lib/validation/schemas";
import { AppError } from "@/lib/utils/helpers";

// ===================================================================
// SIGNUP
// ===================================================================

export async function signUpUser(
  email: string,
  password: string,
  name: string,
  phone?: string
) {
  try {
    // Validate input
    const validated = SignUpSchema.parse({ email, password, name, phone });

    // Create auth user via Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: false, // Require email verification
    });

    if (authError) {
      throw new AppError("AUTH_SIGNUP_FAILED", authError.message, 400);
    }

    if (!authData.user) {
      throw new AppError("AUTH_SIGNUP_FAILED", "Failed to create user", 500);
    }

    // Create user profile in public.users table
    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        role: "customer",
        email_verified: false,
      });

    if (profileError) {
      // Delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new AppError("AUTH_PROFILE_CREATION_FAILED", profileError.message, 500);
    }

    return {
      userId: authData.user.id,
      email: authData.user.email,
      message: "Signup successful. Please verify your email.",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AUTH_SIGNUP_ERROR", "An unexpected error occurred during signup", 500);
  }
}

// ===================================================================
// LOGIN
// ===================================================================

export async function loginUser(email: string, password: string) {
  try {
    // Validate input
    const validated = LogInSchema.parse({ email, password });

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      throw new AppError("AUTH_LOGIN_FAILED", "Invalid email or password", 401);
    }

    if (!data.session) {
      throw new AppError("AUTH_LOGIN_FAILED", "Failed to create session", 500);
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, email, name, phone, role, email_verified")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      throw new AppError("AUTH_PROFILE_FETCH_FAILED", profileError.message, 500);
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userProfile?.name,
        phone: userProfile?.phone,
        role: userProfile?.role || "customer",
        emailVerified: userProfile?.email_verified,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AUTH_LOGIN_ERROR", "An unexpected error occurred during login", 500);
  }
}

// ===================================================================
// LOGOUT
// ===================================================================

export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AppError("AUTH_LOGOUT_FAILED", error.message, 400);
    }
    return { message: "Logged out successfully" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AUTH_LOGOUT_ERROR", "Failed to logout", 500);
  }
}

// ===================================================================
// PASSWORD RESET
// ===================================================================

export async function requestPasswordReset(email: string) {
  try {
    // Validate input
    const validated = ResetPasswordSchema.parse({ email });

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
    });

    if (error) {
      throw new AppError("PASSWORD_RESET_FAILED", error.message, 400);
    }

    return {
      message: "Password reset email sent. Check your inbox (valid for 30 minutes).",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("PASSWORD_RESET_ERROR", "Failed to send password reset email", 500);
  }
}

// ===================================================================
// CONFIRM PASSWORD RESET
// ===================================================================

export async function confirmPasswordReset(token: string, newPassword: string) {
  try {
    // Validate input
    if (!token) {
      throw new AppError("INVALID_TOKEN", "Reset token is missing or expired", 400);
    }

    if (newPassword.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters", 400);
    }

    // Update password with token
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new AppError("PASSWORD_UPDATE_FAILED", error.message, 400);
    }

    return { message: "Password updated successfully" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("PASSWORD_UPDATE_ERROR", "Failed to update password", 500);
  }
}

// ===================================================================
// GET CURRENT SESSION
// ===================================================================

export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new AppError("SESSION_FETCH_FAILED", error.message, 400);
    }

    if (!data.session) {
      return null;
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("id, email, name, phone, role, email_verified")
      .eq("id", data.session.user.id)
      .single();

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        name: userProfile?.name,
        phone: userProfile?.phone,
        role: userProfile?.role || "customer",
        emailVerified: userProfile?.email_verified,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    return null;
  }
}

// ===================================================================
// REFRESH SESSION
// ===================================================================

export async function refreshSession(refreshToken: string) {
  try {
    if (!refreshToken) {
      throw new AppError("INVALID_TOKEN", "Refresh token is missing", 400);
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new AppError("SESSION_REFRESH_FAILED", error.message, 401);
    }

    if (!data.session) {
      throw new AppError("SESSION_REFRESH_FAILED", "Failed to refresh session", 500);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SESSION_REFRESH_ERROR", "Failed to refresh session", 500);
  }
}

// ===================================================================
// VERIFY EMAIL
// ===================================================================

export async function verifyEmail(email: string) {
  try {
    // Send verification email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      throw new AppError("VERIFY_EMAIL_FAILED", error.message, 400);
    }

    return { message: "Verification email sent. Check your inbox." };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("VERIFY_EMAIL_ERROR", "Failed to send verification email", 500);
  }
}

// ===================================================================
// CHECK IF USER EXISTS
// ===================================================================

export async function checkUserExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (error && error.code === "PGRST116") {
      // Row not found
      return false;
    }

    return !!data;
  } catch {
    return false;
  }
}

// ===================================================================
// GET USER BY ID
// ===================================================================

export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, phone, role, email_verified, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      throw new AppError("USER_FETCH_FAILED", error.message, 404);
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("USER_FETCH_ERROR", "Failed to fetch user", 500);
  }
}
