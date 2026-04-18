/**
 * Navbar — top navigation bar.
 * Shows different links based on user role.
 * Displays the logged-in user's name and a logout button.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        🌱 <span style={styles.brandText}>SmartSeason</span>
      </div>

      <div style={styles.links}>
        <Link
          to="/dashboard"
          style={{ ...styles.link, ...(isActive('/dashboard') ? styles.activeLink : {}) }}
        >
          Dashboard
        </Link>

        {/* Admin-only navigation */}
        {isAdmin() && (
          <Link
            to="/fields"
            style={{ ...styles.link, ...(isActive('/fields') ? styles.activeLink : {}) }}
          >
            Manage Fields
          </Link>
        )}
      </div>

      <div style={styles.userSection}>
        <span style={styles.userName}>
          {user?.first_name || user?.username}
          <span style={styles.roleBadge}>{user?.role}</span>
        </span>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 2rem', height: '60px',
    background: '#1a2e1a', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' },
  brandText: { fontWeight: 700, color: '#7ecb6f', letterSpacing: '0.5px' },
  links: { display: 'flex', gap: '1.5rem' },
  link: { color: '#cde8c5', textDecoration: 'none', fontSize: '0.95rem', padding: '4px 8px', borderRadius: '4px' },
  activeLink: { background: '#2d4a2d', color: '#7ecb6f', fontWeight: 600 },
  userSection: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontSize: '0.9rem', color: '#cde8c5', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  roleBadge: {
    background: '#2d4a2d', color: '#7ecb6f', fontSize: '0.7rem',
    padding: '2px 8px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase',
  },
  logoutBtn: {
    background: 'transparent', border: '1px solid #4a7a4a', color: '#cde8c5',
    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
  },
};