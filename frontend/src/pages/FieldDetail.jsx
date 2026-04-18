/**
 * FieldDetail — shows full info for one field.
 *
 * Admins see: all field info + edit link
 * Agents see: their assigned field + a form to post stage updates with notes
 *
 * Both see the update history log.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STAGES = ['planted', 'growing', 'ready', 'harvested'];

export default function FieldDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { isAdmin }  = useAuth();

  const [field, setField]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Update form state
  const [updateForm, setUpdateForm] = useState({ new_stage: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [updateMsg, setUpdateMsg]   = useState('');

  useEffect(() => {
    const fetchField = async () => {
      try {
        const res = await api.get(`/api/fields/${id}/`);
        setField(res.data);
        setUpdateForm(f => ({ ...f, new_stage: res.data.current_stage }));
      } catch (err) {
        setError('Field not found or you do not have access.');
      } finally {
        setLoading(false);
      }
    };
    fetchField();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setUpdateMsg('');

    try {
      await api.post(`/api/fields/${id}/updates/`, updateForm);
      // Refresh field data to show new stage + update in history
      const res = await api.get(`/api/fields/${id}/`);
      setField(res.data);
      setUpdateMsg('✅ Field updated successfully!');
      setUpdateForm(f => ({ ...f, notes: '' }));
    } catch (err) {
      setUpdateMsg('❌ Failed to update field.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading field details…</div>;
  if (error)   return <div style={styles.error}>{error}</div>;
  if (!field)  return null;

  const statusStyle = {
    active:    { bg: '#e8f5e9', color: '#2e7d32' },
    at_risk:   { bg: '#fff3e0', color: '#e65100' },
    completed: { bg: '#e3f2fd', color: '#1565c0' },
  }[field.status] || {};

  return (
    <div style={styles.page}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.fieldName}>{field.name}</h1>
          <p style={styles.cropType}>🌾 {field.crop_type}</p>
        </div>
        <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.color }}>
          {field.status.replace('_', ' ')}
        </span>
      </div>

      {/* ── Info Grid ── */}
      <div style={styles.infoGrid}>
        <InfoRow label="Stage"         value={field.current_stage} />
        <InfoRow label="Planted"       value={new Date(field.planting_date).toLocaleDateString()} />
        <InfoRow label="Location"      value={field.location || '—'} />
        <InfoRow label="Assigned To"   value={field.assigned_to?.username || 'Unassigned'} />
        <InfoRow label="Last Updated"  value={new Date(field.updated_at).toLocaleString()} />
      </div>

      {/* ── Update Form (agents and admins can post updates) ── */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Post an Update</h2>
        <form onSubmit={handleUpdate}>
          <div style={styles.formRow}>
            <div style={styles.formField}>
              <label style={styles.label}>New Stage</label>
              <select
                value={updateForm.new_stage}
                onChange={e => setUpdateForm({ ...updateForm, new_stage: e.target.value })}
                style={styles.select}
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formField}>
            <label style={styles.label}>Notes / Observations</label>
            <textarea
              value={updateForm.notes}
              onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })}
              style={styles.textarea}
              placeholder="Describe current conditions, issues, or progress…"
              rows={3}
            />
          </div>

          {updateMsg && <p style={styles.updateMsg}>{updateMsg}</p>}

          <button type="submit" style={styles.btn} disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit Update'}
          </button>
        </form>
      </div>

      {/* ── Update History ── */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Update History</h2>
        {field.recent_updates.length === 0
          ? <p style={styles.empty}>No updates yet.</p>
          : field.recent_updates.map(u => (
            <div key={u.id} style={styles.updateEntry}>
              <div style={styles.updateHeader}>
                <strong>{u.agent_name}</strong> → <span style={styles.stageTag}>{u.new_stage}</span>
                <span style={styles.updateDate}>{new Date(u.created_at).toLocaleString()}</span>
              </div>
              {u.notes && <p style={styles.updateNotes}>{u.notes}</p>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#888', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1a2e1a', textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}

const styles = {
  page:        { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  back:        { background: 'none', border: 'none', color: '#2d6a2d', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem', padding: 0 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  fieldName:   { margin: 0, fontSize: '1.8rem', color: '#1a2e1a' },
  cropType:    { margin: '0.25rem 0 0', color: '#4a6741', fontWeight: 500 },
  statusBadge: { padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize' },
  infoGrid:    { background: '#fff', borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  card:        { background: '#fff', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  cardTitle:   { margin: '0 0 1rem', color: '#2d4a2d', fontSize: '1.05rem' },
  formRow:     { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  formField:   { flex: 1, marginBottom: '1rem' },
  label:       { display: 'block', fontWeight: 600, color: '#333', fontSize: '0.88rem', marginBottom: '0.4rem' },
  select:      { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '7px', fontSize: '0.9rem' },
  textarea:    { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '7px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' },
  btn:         { background: '#2d6a2d', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' },
  updateMsg:   { margin: '0.75rem 0', fontSize: '0.9rem' },
  updateEntry: { borderBottom: '1px solid #f0f0f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' },
  updateHeader: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' },
  stageTag:    { background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize' },
  updateDate:  { color: '#aaa', fontSize: '0.8rem', marginLeft: 'auto' },
  updateNotes: { color: '#555', fontSize: '0.88rem', margin: '0.4rem 0 0' },
  empty:       { color: '#aaa', fontSize: '0.9rem' },
  loading:     { textAlign: 'center', padding: '4rem', color: '#888' },
  error:       { textAlign: 'center', padding: '4rem', color: '#c0392b' },
};