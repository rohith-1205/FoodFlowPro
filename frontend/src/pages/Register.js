import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ROLES = [
  { role: 'customer', label: '🛒 Customer', color: '#4ecdc4' },
  { role: 'waiter', label: '🍽️ Waiter', color: '#45b7d1' },
  { role: 'kitchen', label: '👨‍🍳 Kitchen', color: '#f7b731' },
  { role: 'delivery', label: '🛵 Delivery', color: '#fd9644' },
  { role: 'manager', label: '📊 Manager', color: '#a55eea' },
  { role: 'admin', label: '⚙️ Admin', color: '#fc5c65' },
];

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      navigate('/');
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
      const redirectMap = {
        customer: '/',
        waiter: '/dashboard',
        kitchen: '/dashboard',
        delivery: '/dashboard',
        manager: '/dashboard',
        admin: '/dashboard',
      };
      navigate(redirectMap[data.user.role] || '/');
    } catch (err) {
      setError(err.message || 'Demo login failed. Please seed the database first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create Account 🎉</h1>
          <p>Join FoodFlow Pro today</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" name="name" type="text" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" placeholder="9876543210" value={form.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider"><span>OR QUICK DEMO LOGIN</span></div>

        <div className="demo-grid">
          {DEMO_ROLES.map(({ role, label, color }) => (
            <button
              key={role}
              type="button"
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
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
