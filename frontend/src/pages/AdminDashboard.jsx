/**
 * AdminDashboard — overview for coordinators.
 * Shows:
 *   - Summary stats cards (total fields, agents, status breakdown)
 *   - At-risk fields alert list
 *   - Full list of all fields as FieldCards
 */

import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import FieldCard from '../components/FieldCard';

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [fields, setFields] = useState([]);
  const [filter, setFilter] = useState('all'); // status filter
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
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter fields by selected status tab
  const filteredFields = filter === 'all'
    ? fields
    : fields.filter(f => f.status === filter);

  if (loading) return <div style={styles.loading}>Loading dashboard…</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard</h1>

      {/* ── Stats Cards ── */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard label="Total Fields"  value={stats.total_fields}               color="#2d6a2d" />
          <StatCard label="Total Agents"  value={stats.total_agents}               color="#1565c0" />
          <StatCard label="Active"        value={stats.status_counts.active}        color="#388e3c" />
          <StatCard label="At Risk"       value={stats.status_counts.at_risk}       color="#e65100" />
          <StatCard label="Completed"     value={stats.status_counts.completed}     color="#1976d2" />
        </div>
      )}

      {/* ── Stage Breakdown ── */}
      {stats && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Stage Breakdown</h2>
          <div style={styles.stageRow}>
            {Object.entries(stats.stage_counts).map(([stage, count]) => (
              <div key={stage} style={styles.stageChip}>
                <span style={styles.stageCount}>{count}</span>
                <span style={styles.stageLabel}>{stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── At Risk Alert ── */}
      {stats?.at_risk_fields?.length > 0 && (
        <div style={styles.alert}>
          <h3 style={styles.alertTitle}>⚠️ Fields At Risk ({stats.at_risk_fields.length})</h3>
          {stats.at_risk_fields.map(f => (
            <p key={f.id} style={styles.alertItem}>
              <strong>{f.name}</strong> ({f.crop}) — {f.days_planted} days since planting
            </p>
          ))}
        </div>
      )}

      {/* ── Field List with Filter Tabs ── */}
      <div style={styles.section}>
        <div style={styles.tabRow}>
          {['all', 'active', 'at_risk', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{ ...styles.tab, ...(filter === s ? styles.activeTab : {}) }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {filteredFields.length === 0
          ? <p style={styles.empty}>No fields match this filter.</p>
          : filteredFields.map(f => <FieldCard key={f.id} field={f} />)
        }
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <div style={{ ...styles.statValue, color }}>{value ?? 0}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page:       { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
  title:      { color: '#1a2e1a', fontSize: '1.8rem', marginBottom: '1.5rem' },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:   { background: '#fff', borderRadius: '10px', padding: '1.25rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  statValue:  { fontSize: '2.2rem', fontWeight: 800 },
  statLabel:  { color: '#888', fontSize: '0.85rem', marginTop: '0.25rem' },
  section:    { marginBottom: '2rem' },
  sectionTitle: { color: '#2d4a2d', fontSize: '1.1rem', marginBottom: '1rem' },
  stageRow:   { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  stageChip:  { background: '#f0f7ee', borderRadius: '8px', padding: '0.75rem 1.25rem', textAlign: 'center' },
  stageCount: { display: 'block', fontSize: '1.5rem', fontWeight: 700, color: '#2d6a2d' },
  stageLabel: { fontSize: '0.8rem', color: '#888', textTransform: 'capitalize' },
  alert:      { background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '2rem' },
  alertTitle: { margin: '0 0 0.75rem', color: '#e65100' },
  alertItem:  { margin: '0.3rem 0', color: '#bf360c', fontSize: '0.9rem' },
  tabRow:     { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  tab:        { padding: '6px 16px', border: '1.5px solid #ddd', borderRadius: '20px', background: '#fff', cursor: 'pointer', textTransform: 'capitalize', fontSize: '0.875rem' },
  activeTab:  { background: '#2d6a2d', color: '#fff', borderColor: '#2d6a2d' },
  empty:      { color: '#aaa', textAlign: 'center', padding: '2rem' },
  loading:    { textAlign: 'center', padding: '4rem', color: '#888' },
};