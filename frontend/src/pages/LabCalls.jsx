import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, Modal, FormField, Spinner, EmptyState, inputStyle, ConfirmDialog } from '../components/UI';
import { format } from 'date-fns';

const LAB_TYPES = ['Sprint Kickoff', 'Momentum', 'Community', 'No Labs', 'Other'];
const SPRINT_PERIODS = ['JAN-FEB', 'MAR-APR', 'MAY-JUN', 'JUL-AUG', 'SEP-OCT', 'NOV-DEC'];

const LAB_TYPE_COLORS = {
  'Sprint Kickoff': { bg: '#E6F0FF', color: '#003DA6' },
  'Momentum':       { bg: '#E8F9FF', color: '#00ABC8' },
  'Community':      { bg: '#E8F5EE', color: '#2E7D52' },
  'No Labs':        { bg: '#F0F2F5', color: '#8B95A8' },
  'Other':          { bg: '#FEF3E2', color: '#C97A1B' },
};

function LabTypeBadge({ type }) {
  const s = LAB_TYPE_COLORS[type] || LAB_TYPE_COLORS['Other'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {type}
    </span>
  );
}

// Build Google Calendar URL — pre-fills everything, just click Save in Google Calendar
const buildGCalUrl = (call) => {
  const [y, m, d] = call.call_date.toString().split('T')[0].split('-');
  const month = parseInt(m);
  // EDT = UTC-4 (Mar-Nov), EST = UTC-5 (Nov-Feb)
  const utcHour = (month >= 3 && month <= 11) ? 15 : 16;
  const start = `${y}${m}${d}T${utcHour}0000Z`;
  const end   = `${y}${m}${d}T${utcHour + 1}0000Z`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `ACES Lab: ${call.topic || 'Lab Call'}`,
    dates: `${start}/${end}`,
    details: call.short_recap || '',
    location: call.meeting_url || 'https://mrse.co/aces-zoom',
    add: 'acesteam@mirasee.com',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const blank = {
  call_date: '', day_of_week: 'Tuesday', topic: '', lab_type: 'Momentum',
  sprint_period: '', execution_week: '', presenter: '', host_recorder: '',
  email_content: '', short_recap: '', meeting_url: 'https://mrse.co/aces-zoom',
  recording_url: '', notes: '',
};

export default function LabCalls() {
  const { isAdmin } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.get('/lab-calls').then(setCalls).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openForm = (call = null) => {
    setEditTarget(call);
    setForm(call ? { ...blank, ...call } : blank);
    setShowForm(true);
  };

  const saveCall = async () => {
    if (!form.call_date || !form.topic) { alert('Date and topic are required.'); return; }
    setSaving(true);
    try {
      if (editTarget?.id) {
        await api.put(`/lab-calls/${editTarget.id}`, form);
      } else {
        await api.post('/lab-calls', form);
      }
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  // CSV Import
  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { setImportResult({ error: 'Invalid CSV' }); setImporting(false); return; }

      const parseCSVLine = (line) => {
        const result = []; let current = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') { inQuotes = !inQuotes; }
          else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
          else { current += line[i]; }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '').replace(/^_+|_+$/g, ''));
      const calls = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        if (!row.date && !row.call_date) continue;
        const dateStr = row.date || row.call_date || '';
        let callDate = '';
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d)) callDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        if (!callDate) continue;
        const dayRaw = (row.day || '').toLowerCase();
        const dow = dayRaw.includes('tues') ? 'Tuesday' : dayRaw.includes('thurs') ? 'Thursday' : '';
        calls.push({
          call_date: callDate, day_of_week: dow,
          topic: row.lab_title || row.topic || '',
          lab_type: row.lab_type || 'Other',
          sprint_period: row.sprint || '',
          execution_week: row.execution_week ? parseInt(row.execution_week) : null,
          presenter: row.main_presenter || row.presenter || '',
          host_recorder: row.hostrecorder || row.host_recorder || '',
          email_content: row.email_promo__description || row.email_content || '',
          short_recap: row.short_recap || '',
          meeting_url: 'https://mrse.co/aces-zoom',
        });
      }

      try {
        const result = await api.post('/lab-calls/bulk-import', { calls });
        setImportResult(result);
        if (result.imported > 0) load();
      } catch (err) { setImportResult({ error: err.message }); }
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const fmtDate = (d) => {
    try {
      const [y,m,day] = d.split('T')[0].split('-');
      return format(new Date(parseInt(y), parseInt(m)-1, parseInt(day)), 'EEE, MMM d, yyyy');
    } catch { return d; }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = calls.filter(c => c.call_date >= today);
  const past = calls.filter(c => c.call_date < today);
  const base = tab === 'upcoming' ? upcoming : past;
  const displayed = sprintFilter === 'all' ? base : base.filter(c => c.sprint_period === sprintFilter);

  return (
    <div>
      <PageHeader
        title="Lab Calls"
        subtitle="Tuesday & Thursday · 11:00 AM Eastern"
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            {isAdmin && (
              <>
                <Btn variant="ghost" onClick={() => fileRef.current.click()} disabled={importing}>
                  {importing ? 'Importing…' : '⬆ Import CSV'}
                </Btn>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
                <Btn variant="gold" onClick={() => openForm()}>+ Schedule Call</Btn>
              </>
            )}
          </div>
        }
      />

      {importResult && (
        <div style={{ marginBottom: '16px', padding: '14px 18px', borderRadius: '10px', background: importResult.error ? 'var(--red-light)' : '#E8F5EE', border: `1px solid ${importResult.error ? 'rgba(201,76,76,0.2)' : 'rgba(46,125,82,0.2)'}`, fontSize: '13.5px' }}>
          {importResult.error
            ? <span style={{ color: 'var(--red)' }}>❌ {importResult.error}</span>
            : <div>
                <div style={{ color: '#2E7D52', fontWeight: '600' }}>✓ Import complete — {importResult.imported} imported, {importResult.failed} failed</div>
                {importResult.errors?.map((e, i) => <div key={i} style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>• {e}</div>)}
              </div>
          }
          <button onClick={() => setImportResult(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--gray-400)', marginTop: '-2px' }}>✕</button>
        </div>
      )}

      {/* ACES Google Calendar Embed — DO NOT REMOVE */}
      <div style={{ marginBottom: '28px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)' }}>
        <iframe
          src="https://calendar.google.com/calendar/embed?src=mirasee.com_e1vm1md95hhpmus5hkm65gae20%40group.calendar.google.com&ctz=America%2FToronto&mode=WEEK&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0"
          style={{ border: 0, display: 'block', width: '100%', height: '600px' }}
          frameBorder="0"
          scrolling="no"
          title="ACES Business Acceleration Calendar"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['upcoming', 'past'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setSprintFilter('all')} style={filterBtn(sprintFilter === 'all')}>All Sprints</button>
          {SPRINT_PERIODS.map(s => (
            <button key={s} onClick={() => setSprintFilter(s)} style={filterBtn(sprintFilter === s)}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner size={36} /></div>
      ) : displayed.length === 0 ? (
        <EmptyState icon="◎" title={`No ${tab} lab calls`}
          description={tab === 'upcoming' ? 'Schedule your next call or import your CSV.' : 'No past calls recorded.'}
          action={isAdmin && tab === 'upcoming' && <Btn variant="gold" onClick={() => openForm()}>+ Schedule Call</Btn>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
          {displayed.map(call => (
            <Card key={call.id} style={{ padding: '0', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelected(call)}>
              <div style={{ height: '3px', background: LAB_TYPE_COLORS[call.lab_type]?.color || '#8B95A8', opacity: 0.6 }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1, paddingRight: '10px' }}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '3px', lineHeight: '1.4' }}>{call.topic || 'Lab Call'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>{fmtDate(call.call_date)} · 11:00 AM ET</div>
                  </div>
                  {call.lab_type && <LabTypeBadge type={call.lab_type} />}
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--gray-600)', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {call.presenter && <span>🎤 {call.presenter}</span>}
                  {call.host_recorder && <span>🎙 {call.host_recorder}</span>}
                </div>

                <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--gray-400)', marginBottom: '12px' }}>
                  <span>👥 {call.registered_count || 0} registered</span>
                  <span>✓ {call.attended_count || 0} attended</span>
                </div>

                {/* Links row — above admin buttons */}
                <div style={{ display: 'flex', gap: '14px', marginBottom: isAdmin ? '10px' : '0', alignItems: 'center' }}>
                  {call.meeting_url && (
                    <a href={call.meeting_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: '12.5px', color: '#003DA6', fontWeight: '600', textDecoration: 'none' }}>
                      Join Call
                    </a>
                  )}
                  {call.recording_url && (
                    <a href={call.recording_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: '12.5px', color: '#003DA6', fontWeight: '600', textDecoration: 'none' }}>
                      Recording
                    </a>
                  )}
                  <a href={buildGCalUrl(call)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ fontSize: '12.5px', color: '#2E7D52', fontWeight: '600', textDecoration: 'none' }}>
                    + Add to Calendar
                  </a>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--gray-50)' }} onClick={e => e.stopPropagation()}>
                    <Btn size="sm" variant="ghost" onClick={() => openForm(call)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(call)}>Delete</Btn>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Lab Call' : 'Schedule Lab Call'} width={680}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={sectionLabel}>Basic Info</div>
          <div style={grid2}>
            <FormField label="Date" required>
              <input type="date" style={inputStyle} value={form.call_date} onChange={e => setForm(f => ({ ...f, call_date: e.target.value }))} />
            </FormField>
            <FormField label="Day of Week">
              <select style={inputStyle} value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                <option value="">Select day</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Thursday">Thursday</option>
              </select>
            </FormField>
          </div>
          <FormField label="Topic / Title" required>
            <input style={inputStyle} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Build a Weekly Execution Rhythm" />
          </FormField>
          <div style={grid2}>
            <FormField label="Lab Type">
              <select style={inputStyle} value={form.lab_type} onChange={e => setForm(f => ({ ...f, lab_type: e.target.value }))}>
                <option value="">Select type</option>
                {LAB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Sprint Period">
              <select style={inputStyle} value={form.sprint_period} onChange={e => setForm(f => ({ ...f, sprint_period: e.target.value }))}>
                <option value="">Select sprint</option>
                {SPRINT_PERIODS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <div style={grid2}>
            <FormField label="Execution Week" hint="0 = kickoff week, 1–6 = sprint weeks">
              <input type="number" min="0" max="6" style={inputStyle} value={form.execution_week} onChange={e => setForm(f => ({ ...f, execution_week: e.target.value }))} placeholder="e.g. 1" />
            </FormField>
            <FormField label="Meeting URL">
              <input style={inputStyle} value={form.meeting_url} onChange={e => setForm(f => ({ ...f, meeting_url: e.target.value }))} placeholder="https://mrse.co/aces-zoom" />
            </FormField>
          </div>

          <div style={sectionLabel}>People</div>
          <div style={grid2}>
            <FormField label="Main Presenter">
              <input style={inputStyle} value={form.presenter} onChange={e => setForm(f => ({ ...f, presenter: e.target.value }))} placeholder="e.g. Jay" />
            </FormField>
            <FormField label="Host / Recorder">
              <input style={inputStyle} value={form.host_recorder} onChange={e => setForm(f => ({ ...f, host_recorder: e.target.value }))} placeholder="e.g. Andrea" />
            </FormField>
          </div>

          <div style={sectionLabel}>Content</div>
          <FormField label="Short Recap" hint="Used for calendar description — keep it concise">
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.short_recap} onChange={e => setForm(f => ({ ...f, short_recap: e.target.value }))} placeholder="2–3 sentence summary for the calendar invite…" />
          </FormField>
          <FormField label="Email Promo / Description" hint="Full email content that goes out to entrepreneurs">
            <textarea style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} value={form.email_content} onChange={e => setForm(f => ({ ...f, email_content: e.target.value }))} placeholder="Subject: ...&#10;&#10;Hi {{First Name}},&#10;&#10;..." />
          </FormField>
          <FormField label="Recording URL">
            <input style={inputStyle} value={form.recording_url} onChange={e => setForm(f => ({ ...f, recording_url: e.target.value }))} placeholder="https://..." />
          </FormField>
          <FormField label="Internal Notes">
            <textarea style={{ ...inputStyle, minHeight: '60px' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={saveCall} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </div>
      </Modal>

      {selected && <CallDetailModal call={selected} onClose={() => setSelected(null)} onRefresh={load} buildGCalUrl={buildGCalUrl} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await api.delete(`/lab-calls/${deleteTarget.id}`); load(); }}
        title="Delete Lab Call"
        message={`Delete "${deleteTarget?.topic}"? This cannot be undone.`}
      />
    </div>
  );
}

function CallDetailModal({ call, onClose, onRefresh, buildGCalUrl }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    api.get(`/lab-calls/${call.id}`).then(setDetail).finally(() => setLoading(false));
  }, [call.id]);

  const toggleAttendance = async (entrepreneurId, current) => {
    await api.post(`/lab-calls/${call.id}/attendance`, { entrepreneur_id: entrepreneurId, attended: !current });
    api.get(`/lab-calls/${call.id}`).then(setDetail);
  };

  const fmtDate = (d) => {
    try {
      const [y,m,day] = d.split('T')[0].split('-');
      return format(new Date(parseInt(y), parseInt(m)-1, parseInt(day)), 'EEEE, MMMM d, yyyy');
    } catch { return d; }
  };

  return (
    <Modal open onClose={onClose} title={call.topic || 'Lab Call'} width={620}>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {call.lab_type && <span style={{ fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: '#E6F0FF', color: '#003DA6' }}>{call.lab_type}</span>}
            {call.sprint_period && <span style={{ fontSize: '12px', fontWeight: '600', color: '#003DA6' }}>{call.sprint_period}</span>}
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{fmtDate(call.call_date)} · 11:00 AM ET</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
            {call.presenter && <div><span style={{ color: 'var(--gray-400)' }}>Presenter: </span><strong>{call.presenter}</strong></div>}
            {call.host_recorder && <div><span style={{ color: 'var(--gray-400)' }}>Host/Recorder: </span><strong>{call.host_recorder}</strong></div>}
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {call.meeting_url && <a href={call.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#003DA6', fontWeight: '600', textDecoration: 'none' }}>Join Call</a>}
            {call.recording_url && <a href={call.recording_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#003DA6', fontWeight: '600', textDecoration: 'none' }}>Recording</a>}
            <a href={buildGCalUrl(call)} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2E7D52', fontWeight: '600', textDecoration: 'none' }}>+ Add to Calendar</a>
          </div>

          {call.short_recap && (
            <div style={{ background: 'var(--gray-50)', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Calendar Recap</div>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6', margin: 0 }}>{call.short_recap}</p>
            </div>
          )}

          {call.email_content && (
            <div>
              <button onClick={() => setShowEmail(s => !s)} style={{ background: 'none', border: '1px solid var(--gray-100)', borderRadius: '8px', padding: '7px 14px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', color: '#003DA6' }}>
                {showEmail ? '▲ Hide Email Content' : '▼ View Email Content'}
              </button>
              {showEmail && (
                <pre style={{ marginTop: '10px', background: 'var(--gray-50)', borderRadius: '8px', padding: '14px', fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.7', color: 'var(--gray-600)', fontFamily: 'var(--font-body)', border: '1px solid var(--gray-100)' }}>
                  {call.email_content}
                </pre>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
              Attendance · {detail?.attendees?.filter(a => a.attended).length || 0} of {detail?.attendees?.length || 0} attended
            </div>
            {!detail?.attendees?.length ? (
              <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No attendees registered.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {detail.attendees.map(a => (
                  <div key={a.entrepreneur_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: a.attended ? '#E8F5EE' : 'var(--off-white)', border: '1px solid', borderColor: a.attended ? 'rgba(46,125,82,0.2)' : 'var(--gray-100)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{a.first_name} {a.last_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{a.company_name}</div>
                    </div>
                    <button onClick={() => toggleAttendance(a.entrepreneur_id, a.attended)} style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: '600', border: '1.5px solid', borderColor: a.attended ? '#2E7D52' : 'var(--gray-200)', background: a.attended ? '#2E7D52' : 'var(--white)', color: a.attended ? 'var(--white)' : 'var(--gray-400)', cursor: 'pointer' }}>
                      {a.attended ? '✓ Attended' : 'Mark Attended'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
const sectionLabel = { fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const tabBtn = (active) => ({ padding: '7px 18px', borderRadius: '20px', fontSize: '12.5px', fontWeight: '600', border: '1.5px solid', borderColor: active ? '#003DA6' : 'var(--gray-100)', background: active ? '#003DA6' : 'var(--white)', color: active ? 'var(--white)' : 'var(--gray-600)', cursor: 'pointer' });
const filterBtn = (active) => ({ padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '600', border: '1.5px solid', borderColor: active ? '#003DA6' : 'var(--gray-100)', background: active ? 'rgba(0,61,166,0.08)' : 'var(--white)', color: active ? '#003DA6' : 'var(--gray-600)', cursor: 'pointer' });
