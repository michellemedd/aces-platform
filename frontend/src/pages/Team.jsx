import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Badge, Btn, Modal, FormField, Spinner, EmptyState, inputStyle, ConfirmDialog } from '../components/UI';
import { format, parseISO } from 'date-fns';

const blank = { name: '', email: '', password: '', role: 'coach' };

export default function Team() {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/auth/coaches').then(setCoaches).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openForm = (coach = null) => {
    setEditTarget(coach);
    setForm(coach ? { name: coach.name, email: coach.email, role: coach.role, password: '' } : blank);
    setError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.email || (!editTarget && !form.password)) {
      setError('Name, email and password are required.'); return;
    }
    setSaving(true);
    setError('');
    try {
      if (editTarget?.id) {
        await api.put(`/auth/users/${editTarget.id}`, form);
      } else {
        await api.post('/auth/users', form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const fmt = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return ''; } };

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Manage coaches and administrators"
        action={<Btn variant="gold" onClick={() => openForm()}>+ Add Team Member</Btn>}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner size={36} /></div>
      ) : coaches.length === 0 ? (
        <EmptyState icon="◉" title="No team members" description="Add coaches to start managing entrepreneurs." action={<Btn variant="gold" onClick={() => openForm()}>+ Add Team Member</Btn>} />
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--off-white)' }}>
                {['Member', 'Email', 'Role', 'Joined', ''].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coaches.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(247,248,250,0.5)' }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ ...styles.avatar, background: c.role === 'admin' ? 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)' : 'linear-gradient(135deg, var(--teal) 0%, var(--teal-light) 100%)', color: c.role === 'admin' ? 'var(--navy)' : 'var(--white)' }}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '13.5px' }}>
                        {c.name}
                        {c.id === user?.id && <span style={{ fontSize: '11px', color: 'var(--gold)', marginLeft: '6px', fontWeight: '600' }}>You</span>}
                      </span>
                    </div>
                  </td>
                  <td style={styles.td}><span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{c.email}</span></td>
                  <td style={styles.td}><Badge variant={c.role} label={c.role} /></td>
                  <td style={styles.td}><span style={{ fontSize: '12.5px', color: 'var(--gray-400)' }}>{fmt(c.created_at)}</span></td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Btn size="sm" variant="ghost" onClick={() => openForm(c)}>Edit</Btn>
                      {c.id !== user?.id && (
                        <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(c)}>Remove</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Team Member' : 'Add Team Member'} width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Full Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Coach Name" />
          </FormField>
          <FormField label="Email" required>
            <input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="coach@company.com" />
          </FormField>
          <FormField label={editTarget ? 'New Password (leave blank to keep)' : 'Password'} required={!editTarget}>
            <input type="password" style={inputStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </FormField>
          <FormField label="Role">
            <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
          {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Member'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await api.delete(`/auth/users/${deleteTarget.id}`); load(); }}
        title="Remove Team Member"
        message={`Remove ${deleteTarget?.name} from the team? Their entrepreneurs will be unassigned.`}
      />
    </div>
  );
}

const styles = {
  th: { padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid var(--gray-100)' },
  td: { padding: '14px 16px', borderBottom: '1px solid var(--gray-50)', verticalAlign: 'middle' },
  avatar: {
    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700',
  },
};
