// Dashboard page shown to field agents after login
import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import FieldCard from '../components/FieldCard'
import { useAuth } from '../context/AuthContext'

export default function AgentDashboard() {
  const { user } = useAuth()

  const [stats, setStats] = useState(null)   // summary counts from /api/dashboard/
  const [fields, setFields] = useState([])   // list of fields assigned to this agent
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // fetch dashboard stats and assigned fields whenever the user changes
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)

      try {
        // fire both requests in parallel for speed
        const [statsRes, fieldsRes] = await Promise.all([
          api.get('/api/dashboard/'),
          api.get('/api/fields/'),
        ])

        setStats(statsRes.data)

        // handle both paginated and plain array responses
        const raw = fieldsRes.data
        if (Array.isArray(raw)) {
          setFields(raw)
        } else if (raw?.results) {
          setFields(raw.results)
        } else {
          setFields([])
        }

      } catch (err) {
        console.error(err)

        if (err.response?.status === 401) {
          setError('Session expired. Please login again.')
        } else {
          setError('Failed to load your fields.')
        }

      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (loading) return <div style={styles.loading}>Loading your fields…</div>
  if (error)   return <div style={styles.error}>{error}</div>

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>
        Welcome, {user?.first_name || user?.username} 👋
      </h1>

      {/* stat pills — at risk and completed counts come from the backend */}
      <div style={styles.statsRow}>
        <StatPill label="Assigned Fields" value={stats?.total_fields}            bg="#e8f5e9" color="#2e7d32" />
        <StatPill label="Active"          value={stats?.status_counts?.active}   bg="#e8f5e9" color="#388e3c" />
        <StatPill label="At Risk"         value={stats?.status_counts?.at_risk}  bg="#fff3e0" color="#e65100" />
        <StatPill label="Completed"       value={stats?.status_counts?.completed} bg="#e3f2fd" color="#1565c0" />
      </div>

      {/* alert banner if any assigned fields are at risk */}
      {stats?.at_risk_fields?.length > 0 && (
        <div style={styles.alert}>
          ⚠️ {stats.at_risk_fields.map(f => f?.name || 'Unknown').join(', ')}
        </div>
      )}

      <h2 style={styles.sectionTitle}>My Fields ({fields.length})</h2>

      {fields.length === 0
        ? <p style={styles.empty}>No fields assigned to you yet.</p>
        : fields.map(f => (
            <FieldCard key={f?.id || Math.random()} field={f} />
          ))
      }
    </div>
  )
}

// small pill component for displaying a single stat
function StatPill({ label, value, bg, color }) {
  return (
    <div style={{ ...styles.pill, background: bg }}>
      <span style={{ ...styles.pillValue, color }}>{value ?? 0}</span>
      <span style={styles.pillLabel}>{label}</span>
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '1.6rem', marginBottom: '0.5rem' },

  statsRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },

  pill: { padding: '1rem', borderRadius: '12px', minWidth: '120px' },
  pillValue: { fontSize: '2rem', fontWeight: 800 },
  pillLabel: { fontSize: '0.8rem', color: '#777' },

  alert: { marginTop: '1rem', background: '#fff3e0', padding: '1rem' },

  sectionTitle: { marginTop: '1.5rem' },

  empty: { textAlign: 'center', color: '#aaa' },
  loading: { textAlign: 'center', padding: '4rem' },
  error: { textAlign: 'center', padding: '4rem', color: 'red' },
}