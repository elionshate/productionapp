'use client';

import { useEffect, useState, useCallback } from 'react';
import type { UserResponse } from '../types/ipc';
import { AuthContext } from '../hooks/use-auth';

type AuthScreen = 'loading' | 'register' | 'login';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AuthScreen>('loading');
  const [user, setUser] = useState<UserResponse | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logout = useCallback(() => {
    setUser(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setScreen('login');
  }, []);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  async function checkFirstLaunch() {
    try {
      if (typeof window === 'undefined' || !window.electron) {
        // Not in Electron — skip auth gate for dev browser preview
        setUser({ id: 'dev', username: 'developer', createdAt: new Date() });
        return;
      }

      const result = await window.electron.hasUsers();
      if (result.success) {
        setScreen(result.data ? 'login' : 'register');
      } else {
        setError('Failed to check application state');
        setScreen('login');
      }
    } catch {
      setError('Failed to connect to application backend');
      setScreen('login');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!window.electron) {
        setError('Registration requires the desktop application. Restart the app with Electron.');
        return;
      }

      const result = await window.electron.register({
        username: username.trim(),
        password,
      });

      if (result.success) {
        setUser(result.data);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!window.electron) {
        setError('Login requires the desktop application. Restart the app with Electron.');
        return;
      }

      const result = await window.electron.login({
        username: username.trim(),
        password,
      });

      if (result.success) {
        setUser(result.data);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Authenticated — render the app wrapped in auth context
  if (user) {
    return (
      <AuthContext.Provider value={{ user, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Loading state
  if (screen === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-zinc-500">Starting application...</p>
        </div>
      </div>
    );
  }

  const isRegister = screen === 'register';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Production Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isRegister
              ? 'Create your account to get started'
              : 'Sign in to your account'}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="mb-4">
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-400"
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-400"
              />
            </div>

            {/* Confirm Password (register only) */}
            {isRegister && (
              <div className="mb-4">
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-400"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            >
              {isSubmitting
                ? 'Please wait...'
                : isRegister
                  ? 'Create Account'
                  : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer toggle */}
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setScreen('register');
                  setError('');
                  setPassword('');
                }}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Create Account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
