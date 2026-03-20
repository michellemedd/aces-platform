import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Badge, Btn, Modal, FormField, Spinner, EmptyState, inputStyle, ConfirmDialog } from '../components/UI';
import { format, parseISO } from 'date-fns';

const blankMM = { name: '', start_date: '', end_date: '', description: '', status: 'upcoming' };

export default function Masterminds() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [masterminds, setMasterminds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankMM);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/masterminds').then(setMasterminds).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openForm = (mm = null) => {
    setEditTarget(mm);
    setForm(mm ? { ...mm } : blankMM);
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editTarget?.id) {
        await api.put(`/masterminds/${editTarget.id}`, form);
      } else {
        await api.post('/masterminds', form);
      }
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const fmt = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; } };

  const statusColor = { upcoming: 'var(--teal)', active: 'var(--gold)', completed: 'var(--gray-400)' };

  return (
    <div>
      <PageHeader
        title="Mastermind Events"
        subtitle="Quarterly 2-day virtual events"
        action={isAdmin && <Btn variant="gold" onClick={() => openForm()}>+ New Mastermind</Btn>}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner size={36} /></div>
      ) : masterminds.length === 0 ? (
        <EmptyState icon="◆" title="No Masterminds yet" description="Create your first quarterly mastermind event." action={isAdmin && <Btn variant="gold" onClick={() => openForm()}>+ New Mastermind</Btn>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {masterminds.map(mm => (
            <Card key={mm.id} style={{ padding: '0', overflow: 'hidden' }}>
              {/* Color bar */}
              <div style={{ height: '4px', background: `linear-gradient(90deg, ${statusColor[mm.status] || 'var(--teal)'}, transparent)` }} />
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{mm.name}</h3>
                    <div style={{ fontSize: '12.5px', color: 'var(--gray-400)' }}>{fmt(mm.start_date)} – {fmt(mm.end_date)}</div>
                  </div>
                  <Badge variant={mm.status} label={mm.status} />
                </div>

                {mm.description && <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '14px', lineHeight: '1.5' }}>{mm.description}</p>}

                <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
                  <span>👥 {mm.registrations || 0} registered</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Btn size="sm" variant="primary" onClick={() => navigate(`/masterminds/${mm.id}`)}>View Details</Btn>
                  {isAdmin && (
                    <>
                      <Btn size="sm" variant="ghost" onClick={() => openForm(mm)}>Edit</Btn>
                      <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(mm)}>Delete</Btn>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Mastermind' : 'New Mastermind'} width={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Event Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Q1 2025 Mastermind" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormField label="Start Date" required>
              <input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </FormField>
            <FormField label="End Date" required>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </FormField>
          <FormField label="Description">
            <textarea style={{ ...inputStyle, minHeight: '80px' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Theme, topics covered…" />
          </FormField>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await api.delete(`/masterminds/${deleteTarget.id}`); load(); }}
        title="Delete Mastermind"
        message={`Delete "${deleteTarget?.name}"? All sessions and registrations will be removed.`}
      />
    </div>
  );
}
