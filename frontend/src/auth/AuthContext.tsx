import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type CurrentUser,
} from '../api/auth';
import { ApiError } from '../api/client';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch((error: unknown) => {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error(error);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(
    email: string,
    password: string,
    rememberMe: boolean,
  ) {
    await loginRequest(email, password, rememberMe);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  async function refreshUser() {
    setUser(await getCurrentUser());
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
