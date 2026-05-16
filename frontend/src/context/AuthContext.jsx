import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On app load, if a token exists, verify it with the backend and load the real user
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const data = await getCurrentUser();
          // Laravel returns { id, nom, email, role, statut, city, ... }
          setUser(data.user ?? data);
          setToken(savedToken);
        } catch {
          // Token is invalid or expired — clean up
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const { token: newToken, user: newUser } = await apiLogin(email, password);
    setToken(newToken);
    setUser(newUser);
    return newUser; // return user so callers can redirect based on role
  };

  const logout = async () => {
    await apiLogout();
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: '#94a3b8',
        fontSize: '1rem',
        fontFamily: 'sans-serif',
      }}>
        Loading UrbanMap...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);