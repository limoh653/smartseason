/**
 fielcard component which shows the details of a field
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

// Colors styling for status and stage badges
const statusColors = {
  active:    { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  at_risk:   { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  completed: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
};

const stageColors = {
  planted:   { bg: '#f3e5f5', text: '#6a1b9a' },
  growing:   { bg: '#e8f5e9', text: '#1b5e20' },
  ready:     { bg: '#fff8e1', text: '#f57f17' },
  harvested: { bg: '#e3f2fd', text: '#0d47a1' },
};

export default function FieldCard({ field }) {
  const navigate = useNavigate();

  const statusStyle = statusColors[field.status] || statusColors.active;
  const stageStyle  = stageColors[field.current_stage] || {};

  return (
    <div
      onClick={() => navigate(`/fields/${field.id}`)}
      style={{ ...styles.card, borderLeft: `4px solid ${statusStyle.border}` }}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.name}>{field.name}</h3>
        <span
          style={{
            ...styles.badge,
            background: statusStyle.bg,
            color: statusStyle.text,
          }}
        >
          {field.status.replace('_', ' ')}
        </span>
      </div>

      {/* Crop Type */}
      <p style={styles.crop}>{field.crop_type}</p>

      {/* Location */}
      {field.location && (
        <p style={styles.meta}>{field.location}</p>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <span
          style={{
            ...styles.stageBadge,
            background: stageStyle.bg,
            color: stageStyle.text,
          }}
        >
          {field.current_stage}
        </span>

        <span style={styles.date}>
          Planted: {new Date(field.planting_date).toLocaleDateString()}
        </span>
      </div>

      {/* Assigned Agent */}
      {field.assigned_to && (
        <p style={styles.agent}>{field.assigned_to}</p>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  name: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#1a2e1a',
  },
  badge: {
    fontSize: '0.75rem',
    padding: '3px 10px',
    borderRadius: '12px',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  crop: {
    margin: '0.25rem 0',
    color: '#4a6741',
    fontWeight: 500,
  },
  meta: {
    margin: '0.2rem 0',
    color: '#888',
    fontSize: '0.85rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.75rem',
  },
  stageBadge: {
    fontSize: '0.8rem',
    padding: '3px 10px',
    borderRadius: '8px',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  date: {
    fontSize: '0.8rem',
    color: '#888',
  },
  agent: {
    margin: '0.5rem 0 0',
    fontSize: '0.82rem',
    color: '#6a8f6a',
  },
};