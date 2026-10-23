import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication state and session operations.
 *
 * @returns {{
 *   user: object|null,
 *   loading: boolean,
 *   error: string|null,
 *   isAuthenticated: boolean,
 *   isAdmin: boolean,
 *   login: (email: string, password: string) => Promise<object>,
 *   signup: (name: string, email: string, password: string) => Promise<object>,
 *   logout: () => Promise<void>,
 *   refreshUser: () => Promise<void>
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
