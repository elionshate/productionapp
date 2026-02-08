'use client';

import { createContext, useContext } from 'react';
import type { UserResponse } from '../types/ipc';

interface AuthContextValue {
  user: UserResponse;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * React Hook: useAuth
 * 
 * Provides access to the currently authenticated user and a logout function.
 * Must be used inside <AuthGate> (which provides the AuthContext).
 * 
 * Usage:
 * ```tsx
 * const { user, logout } = useAuth();
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('[useAuth] Must be used inside <AuthGate>');
  }
  return ctx;
}
