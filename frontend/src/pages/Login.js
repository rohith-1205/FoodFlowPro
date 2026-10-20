import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ROLES = [
  { role: 'customer', label: '🛒 Customer', color: '#4ecdc4' },
  { role: 'waiter', label: '🍽️ Waiter', color: '#45b7d1' },
  { role: 'kitchen', label: '👨‍🍳 Kitchen', color: '#f7b731' },
  { role: 'delivery', label: '🛵 Delivery', color: '#fd9644' },
  { role: 'manager', label: '📊 Manager', color: '#a55eea' },
  { role: 'admin', label: '⚙️ Admin', color: '#fc5c65' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError('');
    setLoading(true);
    try {
      const data = await demoLogin(role);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.message || 'Demo login failed. Please seed the database first.');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role) => {
    const redirectMap = {
      customer: '/',
      waiter: '/waiter',
      kitchen: '/kitchen',
      delivery: '/dashboard',
      manager: '/dashboard',
      admin: '/dashboard',
    };
    navigate(location.state?.from?.pathname || redirectMap[role] || '/');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Welcome Back 👋</h1>
          <p>Sign in to FoodFlow Pro</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider"><span>OR DEMO LOGIN</span></div>

        <div className="demo-grid">
          {DEMO_ROLES.map(({ role, label, color }) => (
            <button
              key={role}
              className="demo-btn"
              style={{ borderColor: color, color: color }}
              onClick={() => handleDemoLogin(role)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
