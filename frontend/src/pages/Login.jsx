/**
 * Login page — collects username + password and posts to /api/auth/login/.
 * On success, stores tokens via AuthContext.login() and redirects to dashboard.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login }           = useAuth();
  const navigate            = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/login/', form);
      login(res.data);                   // persist tokens + user in context
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🌱</div>
        <h1 style={styles.title}>SmartSeason</h1>
        <p style={styles.subtitle}>Field Monitoring System</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter username"
              autoFocus
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter password"
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.hint}>Demo: admin / agent1 | agent123</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 50%, #1a3320 100%)',
  },
  card: {
    background: '#fff', borderRadius: '16px', padding: '2.5rem',
    width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
  },
  logo: { fontSize: '3rem', marginBottom: '0.5rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.8rem', color: '#1a2e1a', fontWeight: 800 },
  subtitle: { color: '#7a9a7a', margin: '0 0 2rem', fontSize: '0.9rem' },
  form: { textAlign: 'left' },
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#333', fontSize: '0.9rem' },
  input: {
    width: '100%', padding: '10px 12px', border: '1.5px solid #ddd',
    borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s',
  },
  error: { background: '#ffeaea', color: '#c0392b', padding: '10px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1rem' },
  btn: {
    width: '100%', padding: '12px', background: '#2d6a2d', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', marginTop: '0.5rem',
  },
  hint: { color: '#aaa', fontSize: '0.78rem', marginTop: '1.5rem' },
};