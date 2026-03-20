import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, FormField, Btn, inputStyle } from './UI';

const TIMEZONES = [
  'Hawaii (UTC-10)', 'Alaska (UTC-9)', 'Pacific (UTC-8)', 'Mountain (UTC-7)',
  'Central (UTC-6)', 'Eastern (UTC-5)', 'Atlantic (UTC-4)', 'Newfoundland (UTC-3:30)',
  'Brazil (UTC-3)', 'UTC (UTC+0)', 'London (UTC+0)', 'Paris/Berlin (UTC+1)',
  'Helsinki/Cairo (UTC+2)', 'Moscow/Nairobi (UTC+3)', 'Dubai (UTC+4)',
  'Karachi (UTC+5)', 'Mumbai/Delhi (UTC+5:30)', 'Dhaka (UTC+6)',
  'Bangkok/Jakarta (UTC+7)', 'Singapore/Hong Kong (UTC+8)', 'Beijing/Perth (UTC+8)',
  'Tokyo/Seoul (UTC+9)', 'Sydney (UTC+10)', 'Auckland (UTC+12)', 'Other',
];

const INDUSTRIES = [
  'Business & Marketing', 'Leadership', 'Coaching & Personal Development',
  'Health & Wellness', 'Art & Creativity', 'Spirituality',
  'Parenting & Family', 'Relationships',
];

const STATUSES = [
  'Active', 'ECA', 'On Break', 'Coaching Only', 'Coaching Lite',
  'Offboarded', 'Alumni', 'Discontinued', 'MIA',
];

const blank = {
  first_name: '', last_name: '', email: '', phone: '',
  company_name: '', business_industry: '', timezone: '',
  cohort: '', tags: '', google_drive_url: '', niche: '',
  notes: '', coach_id: '', enrollment_date: '', status: 'Active',
  is_plus: false,
};

export default function EntrepreneurForm({ open, onClose, onSaved, initial }) {
  const { isAdmin, user } = useAuth();
  const [form, setForm] = useState(blank);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generateSprints, setGenerateSprints] = useState(true);

  useEffect(() => {
    if (isAdmin) api.get('/auth/coaches').then(setCoaches).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (initial) {
      setForm({
        ...blank, ...initial,
        tags: Array.isArray(initial.tags) ? initial.tags.join(', ') : (initial.tags || ''),
        coach_id: initial.coach_id || '',
        is_plus: initial.is_plus || false,
        niche: initial.niche || '',
      });
    } else {
      setForm({ ...blank, coach_id: user.id });
    }
    setError('');
  }, [initial, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setError('First name, last name and email are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        coach_id: form.coach_id || user.id,
      };
      let saved;
      if (initial?.id) {
        saved = await api.put(`/entrepreneurs/${initial.id}`, payload);
      } else {
        saved = await api.post('/entrepreneurs', payload);
        if (generateSprints && form.enrollment_date) {
          await api.post('/sprints/generate', {
            entrepreneur_id: saved.id,
            enrollment_start: form.enrollment_date,
          });
        }
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
  const sectionLabel = { fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit Entrepreneur' : 'Add Entrepreneur'} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={sectionLabel}>Personal Info</div>
        <div style={grid2}>
          <FormField label="First Name" required>
            <input style={inputStyle} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jane" />
          </FormField>
          <FormField label="Last Name" required>
            <input style={inputStyle} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
          </FormField>
        </div>
        <div style={grid2}>
          <FormField label="Email" required>
            <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
          </FormField>
          <FormField label="Phone">
            <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
          </FormField>
        </div>

        <div style={sectionLabel}>Business</div>
        <div style={grid2}>
          <FormField label="Company Name">
            <input style={inputStyle} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Inc." />
          </FormField>
          <FormField label="Industry">
            <select style={inputStyle} value={form.business_industry} onChange={e => set('business_industry', e.target.value)}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Niche" hint="Describe the entrepreneur's specific niche">
          <input style={inputStyle} value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="e.g. Online courses for busy moms" />
        </FormField>

        <div style={sectionLabel}>Program Details</div>
        <div style={grid2}>
          <FormField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Cohort">
            <input style={inputStyle} value={form.cohort} onChange={e => set('cohort', e.target.value)} placeholder="e.g. 2024-Q1" />
          </FormField>
        </div>
        <div style={grid2}>
          <FormField label="Enrollment Date">
            <input style={inputStyle} type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} />
          </FormField>
          <FormField label="Timezone">
            <select style={inputStyle} value={form.timezone} onChange={e => set('timezone', e.target.value)}>
              <option value="">Select timezone</option>
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
        </div>
        <div style={grid2}>
          {isAdmin && (
            <FormField label="Assigned Coach">
              <select style={inputStyle} value={form.coach_id} onChange={e => set('coach_id', e.target.value)}>
                <option value="">Select coach</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Membership">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!form.is_plus}
                onChange={e => set('is_plus', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#003DA6' }}>Plus ✦</span>
            </label>
          </FormField>
        </div>

        <div style={sectionLabel}>Additional</div>
        <FormField label="Tags" hint="Comma-separated, e.g. high-priority, year-2">
          <input style={inputStyle} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="tag1, tag2, tag3" />
        </FormField>
        <FormField label="Google Drive Folder URL">
          <input style={inputStyle} value={form.google_drive_url} onChange={e => set('google_drive_url', e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
        </FormField>
        <FormField label="Coach Notes">
          <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes visible to coach only…" />
        </FormField>

        {!initial?.id && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={generateSprints} onChange={e => setGenerateSprints(e.target.checked)} />
            Auto-generate 6 sprints (2 months each) from enrollment date
          </label>
        )}

        {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="gold" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Entrepreneur'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
