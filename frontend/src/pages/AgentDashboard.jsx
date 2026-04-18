/**
 * AgentDashboard — overview for field agents.
 * Shows only the fields assigned to the logged-in agent,
 * with status counts and the field list.
 */

import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import FieldCard from '../components/FieldCard';
import { useAuth } from '../context/AuthContext';

export default function AgentDashboard() {
  const { user }            = useAuth();
  const [stats, setStats]   = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, fieldsRes] = await Promise.all([
          api.get('/api/dashboard/'),
          api.get('/api/fields/'),
        ]);
        setStats(statsRes.data);
        setFields(fieldsRes.data);
      } catch (err) {
        console.error('Failed to load agent dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={styles.loading}>Loading your fields…</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Welcome, {user?.first_name || user?.username} 👋</h1>
      <p style={styles.subtitle}>Here's the status of your assigned fields.</p>

      {/* ── Stats ── */}
      {stats && (
        <div style={styles.statsRow}>
          <StatPill label="Assigned Fields" value={stats.total_fields}          bg="#e8f5e9" color="#2e7d32" />
          <StatPill label="Active"          value={stats.status_counts.active}   bg="#e8f5e9" color="#388e3c" />
          <StatPill label="At Risk"         value={stats.status_counts.at_risk}  bg="#fff3e0" color="#e65100" />
          <StatPill label="Completed"       value={stats.status_counts.completed} bg="#e3f2fd" color="#1565c0" />
        </div>
      )}

      {/* ── At Risk Alert ── */}
      {stats?.at_risk_fields?.length > 0 && (
        <div style={styles.alert}>
          <strong>⚠️ Attention needed:</strong>{' '}
          {stats.at_risk_fields.map(f => f.name).join(', ')} — these fields may need intervention.
        </div>
      )}

      {/* ── Field Cards ── */}
      <h2 style={styles.sectionTitle}>My Fields</h2>
      {fields.length === 0
        ? <p style={styles.empty}>No fields assigned to you yet.</p>
        : fields.map(f => <FieldCard key={f.id} field={f} />)
      }
    </div>
  );
}

function StatPill({ label, value, bg, color }) {
  return (
    <div style={{ ...styles.pill, background: bg }}>
      <span style={{ ...styles.pillValue, color }}>{value ?? 0}</span>
      <span style={styles.pillLabel}>{label}</span>
    </div>
  );
}

const styles = {
  page:         { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  title:        { color: '#1a2e1a', fontSize: '1.6rem', marginBottom: '0.25rem' },
  subtitle:     { color: '#888', marginBottom: '1.5rem' },
  statsRow:     { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  pill:         { borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' },
  pillValue:    { fontSize: '2rem', fontWeight: 800 },
  pillLabel:    { fontSize: '0.8rem', color: '#777', marginTop: '0.2rem' },
  alert:        { background: '#fff3e0', border: '1px solid #ffcc80', padding: '0.75rem 1rem', borderRadius: '8px', color: '#e65100', fontSize: '0.9rem', marginBottom: '1.5rem' },
  sectionTitle: { color: '#2d4a2d', fontSize: '1.1rem', marginBottom: '1rem' },
  empty:        { color: '#aaa', textAlign: 'center', padding: '2rem' },
  loading:      { textAlign: 'center', padding: '4rem', color: '#888' },
};