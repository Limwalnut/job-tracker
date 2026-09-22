import { createContext } from 'react';
import type { CurrentUser } from '../api/auth';

export interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
