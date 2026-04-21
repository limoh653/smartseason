import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import FieldCard from '../components/FieldCard'
import { useAuth } from '../context/AuthContext'

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()

  const [stats, setStats] = useState(null)
  const [fields, setFields] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 🚨 wait for auth before calling APIs
    if (authLoading) return
    if (!user) return

    const fetchData = async () => {
      try {
        const [statsRes, fieldsRes] = await Promise.all([
          api.get('/api/dashboard/'),
          api.get('/api/fields/')
        ])

        setStats(statsRes.data)
        setFields(fieldsRes.data)
      } catch (err) {
        console.error('Dashboard load failed:', err)
        setStats(null)
        setFields([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, authLoading])

  const filteredFields =
    filter === 'all'
      ? fields
      : fields.filter(f => f?.status === filter)

  if (authLoading || loading) {
    return <div style={styles.loading}>Loading dashboard…</div>
  }

  if (!user) {
    return <div style={styles.loading}>Unauthorized</div>
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard</h1>

      {/* stats */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard label="Total Fields" value={stats?.total_fields ?? 0} color="#2d6a2d" />
          <StatCard label="Total Agents" value={stats?.total_agents ?? 0} color="#1565c0" />
          <StatCard label="Active" value={stats?.status_counts?.active ?? 0} color="#388e3c" />
          <StatCard label="At Risk" value={stats?.status_counts?.at_risk ?? 0} color="#e65100" />
          <StatCard label="Completed" value={stats?.status_counts?.completed ?? 0} color="#1976d2" />
        </div>
      )}

      {/* stage breakdown */}
      {stats?.stage_counts && (
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

      {/* alerts */}
      {stats?.at_risk_fields?.length > 0 && (
        <div style={styles.alert}>
          <h3 style={styles.alertTitle}>
            ⚠️ Fields At Risk ({stats.at_risk_fields.length})
          </h3>

          {stats.at_risk_fields.map(f => (
            <p key={f.id} style={styles.alertItem}>
              <strong>{f?.name}</strong> ({f?.crop}) — {f?.days_planted} days
            </p>
          ))}
        </div>
      )}

      {/* filter */}
      <div style={styles.section}>
        <div style={styles.tabRow}>
          {['all', 'active', 'at_risk', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                ...styles.tab,
                ...(filter === s ? styles.activeTab : {})
              }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {filteredFields.length === 0 ? (
          <p style={styles.empty}>No fields match this filter.</p>
        ) : (
          filteredFields.map(f => (
            <FieldCard key={f.id} field={f} />
          ))
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
  title: { fontSize: '1.8rem', marginBottom: '1.5rem' },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },

  statCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.25rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },

  statValue: { fontSize: '2rem', fontWeight: 700 },
  statLabel: { fontSize: '0.85rem', color: '#888' },

  section: { marginBottom: '2rem' },
  sectionTitle: { marginBottom: '1rem' },

  stageRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  stageChip: { padding: '0.75rem 1rem', background: '#f5f5f5', borderRadius: '8px' },

  stageCount: { fontSize: '1.3rem', fontWeight: 'bold', display: 'block' },
  stageLabel: { fontSize: '0.8rem', textTransform: 'capitalize' },

  alert: { padding: '1rem', background: '#fff3e0', borderRadius: '8px' },
  alertTitle: { color: '#e65100' },
  alertItem: { fontSize: '0.9rem' },

  tabRow: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  tab: {
    padding: '6px 14px',
    border: '1px solid #ccc',
    borderRadius: '20px',
    background: '#fff',
    cursor: 'pointer'
  },

  activeTab: { background: '#2d6a2d', color: '#fff' },

  empty: { textAlign: 'center', color: '#aaa' },
  loading: { textAlign: 'center', padding: '3rem' }
}