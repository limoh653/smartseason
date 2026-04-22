/**
 * ManageFields, this is an admin only page where admin can  click the fieldcard and see the details of the field, he/she can edit aor delete a field also..
 
 */

import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import FieldCard from '../components/FieldCard';

export default function ManageFields() {
  const [fields, setFields] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '', crop_type: '', planting_date: '',
    location: '', assigned_to_id: '', current_stage: 'planted',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, agentsRes] = await Promise.all([
          api.get('/api/fields/'),
          api.get('/api/agents/'),
        ]);
        setFields(fieldsRes.data);
        setAgents(agentsRes.data);
      } catch (err) {
        console.error('Failed to load manage fields data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = { ...form };
      //  This Removes empty assigned_to_id to avoid validation errors
      if (!payload.assigned_to_id) delete payload.assigned_to_id;

      const res = await api.post('/api/fields/', payload);

      const newField = { ...res.data };
      if (newField.assigned_to && typeof newField.assigned_to === 'object') {
        newField.assigned_to = newField.assigned_to.username;
      }

      setFields([newField, ...fields]);
      setShowForm(false);
      setForm({ name: '', crop_type: '', planting_date: '', location: '', assigned_to_id: '', current_stage: 'planted' });
      setMessage('SField created successfully!');
    } catch (err) {
      setMessage('Failed to create field. Check all required fields.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading fields…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <h1 style={styles.title}>Manage Fields</h1>
        <button onClick={() => setShowForm(!showForm)} style={styles.createBtn}>
          {showForm ? '✕ Cancel' : '+ New Field'}
        </button>
      </div>

      {message && <p style={styles.message}>{message}</p>}

      {/* Create a Field Form*/}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Create New Field</h2>
          <form onSubmit={handleCreate}>
            <div style={styles.grid2}>
              <FormField label="Field Name *">
                <input name="name" value={form.name} onChange={handleChange} style={styles.input} required placeholder="e.g. North Paddock A" />
              </FormField>
              <FormField label="Crop Type *">
                <input name="crop_type" value={form.crop_type} onChange={handleChange} style={styles.input} required placeholder="e.g. Maize" />
              </FormField>
              <FormField label="Planting Date *">
                <input type="date" name="planting_date" value={form.planting_date} onChange={handleChange} style={styles.input} required />
              </FormField>
              <FormField label="Initial Stage">
                <select name="current_stage" value={form.current_stage} onChange={handleChange} style={styles.input}>
                  {['planted', 'growing', 'ready', 'harvested'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Location (optional)">
                <input name="location" value={form.location} onChange={handleChange} style={styles.input} placeholder="e.g. Nakuru, Rift Valley" />
              </FormField>
              <FormField label="Assign to Agent">
                <select name="assigned_to_id" value={form.assigned_to_id} onChange={handleChange} style={styles.input}>
                  <option value="">— Unassigned —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.first_name ? `${a.first_name} ${a.last_name}` : a.username}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? 'Creating…' : 'Create Field'}
            </button>
          </form>
        </div>
      )}

      {/*Fields List */}
      <div style={styles.list}>
        {fields.length === 0
          ? <p style={styles.empty}>No fields yet. Create one above.</p>
          : fields.map(f => <FieldCard key={f.id} field={f} />)
        }
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, color: '#333', fontSize: '0.88rem', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: { padding: '2rem', maxWidth: '1000px', margin: '0 auto' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { margin: 0, color: '#1a2e1a', fontSize: '1.8rem' },
  createBtn: { background: '#2d6a2d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 },
  message: { marginBottom: '1rem', fontSize: '0.9rem' },
  formCard: { background: '#fff', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' },
  formTitle: { margin: '0 0 1.25rem', color: '#2d4a2d' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '7px', fontSize: '0.9rem', boxSizing: 'border-box' },
  saveBtn: { background: '#2d6a2d', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' },
  list: {},
  empty: { color: '#aaa', textAlign: 'center', padding: '3rem' },
  loading: { textAlign: 'center', padding: '4rem', color: '#888' },
};