import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ffp_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!token) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Session expired');
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('ffp_token');
        localStorage.removeItem('ffp_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('ffp_token', data.token);
    localStorage.setItem('ffp_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (name, email, password, phone) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('ffp_token', data.token);
    localStorage.setItem('ffp_user', JSON.stringify(data.user));
    return data;
  };

  const demoLogin = async (role) => {
    const demoAccounts = {
      customer: 'customer@foodflow.com',
      waiter: 'waiter@foodflow.com',
      kitchen: 'kitchen@foodflow.com',
      delivery: 'delivery@foodflow.com',
      manager: 'manager@foodflow.com',
      admin: 'admin@foodflow.com'
    };
    if (!demoAccounts[role]) throw new Error('Unknown demo role');
    return await login(demoAccounts[role], 'password123');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ffp_token');
    localStorage.removeItem('ffp_user');
  };

  const authFetch = useCallback(async (url, options = {}) => {
    return fetch(`${API}${url}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, demoLogin, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
