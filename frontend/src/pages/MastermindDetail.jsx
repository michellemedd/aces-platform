import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Btn, Modal, FormField, Spinner, inputStyle, StatCard } from '../components/UI';
import { format, parseISO } from 'date-fns';

export default function MastermindDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [mm, setMm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: '', session_date: '', start_time: '', end_time: '', description: '', google_meet_url: '' });
  const [savingSession, setSavingSession] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionAttendees, setShowSessionAttendees] = useState(null);

  const load = async () => {
    setLoading(true);
    const [data, ents] = await Promise.all([
      api.get(`/masterminds/${id}`),
      api.get('/entrepreneurs'),
    ]);
    setMm(data);
    setEntrepreneurs(ents);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const saveSession = async () => {
    setSavingSession(true);
    try {
      await api.post(`/masterminds/${id}/sessions`, sessionForm);
      setShowSessionForm(false);
      setSessionForm({ title: '', session_date: '', start_time: '', end_time: '', description: '', google_meet_url: '' });
      load();
    } finally { setSavingSession(false); }
  };

  const registerEntrepreneur = async (eid) => {
    await api.post(`/masterminds/${id}/register`, { entrepreneur_id: eid });
    load();
  };

  const unregisterEntrepreneur = async (eid) => {
    await api.delete(`/masterminds/${id}/register/${eid}`);
    load();
  };

  const addToSession = async (sessionId, eid) => {
    await api.post(`/masterminds/sessions/${sessionId}/attendees`, { entrepreneur_id: eid });
    load();
  };

  const markInviteSent = async (sessionId, eid) => {
    await api.put(`/masterminds/sessions/${sessionId}/attendees/${eid}/invite`);
    load();
  };

  const fmt = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || ''; } };
  const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={36} /></div>;
  if (!mm) return <div style={{ padding: '40px', color: 'var(--gray-400)' }}>Mastermind not found.</div>;

  const registeredIds = mm.registrations?.map(r => r.entrepreneur_id) || [];

  return (
    <div>
      <button onClick={() => navigate('/masterminds')} style={styles.back}>← Back to Masterminds</button>

      {/* Hero */}
      <div style={styles.hero}>
        <div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '28px' }}>{mm.name}</h1>
            <Badge variant={mm.status} label={mm.status} />
          </div>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>{fmt(mm.start_date)} – {fmt(mm.end_date)} · 2-day virtual event</p>
          {mm.description && <p style={{ color: 'var(--gray-600)', fontSize: '14px', marginTop: '6px', maxWidth: '600px' }}>{mm.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && <Btn variant="ghost" onClick={() => setShowRegister(true)}>Manage Registrations</Btn>}
          {isAdmin && <Btn variant="gold" onClick={() => setShowSessionForm(true)}>+ Add Session</Btn>}
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard label="Registrations" value={mm.registrations?.length || 0} sub="entrepreneurs registered" accent="var(--navy)" />
        <StatCard label="Sessions" value={mm.sessions?.length || 0} sub="scheduled for this event" accent="var(--teal)" />
        <StatCard label="Duration" value="2 Days" sub="virtual event" accent="var(--gold)" />
      </div>

      <div style={styles.twoCol}>
        {/* Sessions */}
        <div>
          <h2 style={styles.sectionTitle}>Sessions</h2>
          {mm.sessions?.length === 0 ? (
            <Card style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>
              No sessions yet. {isAdmin && <button onClick={() => setShowSessionForm(true)} style={{ color: 'var(--gold)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Add one →</button>}
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mm.sessions?.map(session => (
                <Card key={session.id} style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px' }}>{session.title}</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--gray-400)', marginTop: '3px' }}>
                        {fmt(session.session_date)} · {fmtTime(session.start_time)} – {fmtTime(session.end_time)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--gray-400)' }}>{session.attendee_count || 0} attendees</span>
                      {isAdmin && (
                        <Btn size="sm" variant="ghost" onClick={() => setShowSessionAttendees(session)}>Manage</Btn>
                      )}
                    </div>
                  </div>
                  {session.google_meet_url && (
                    <a href={session.google_meet_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: '12.5px', color: 'var(--teal)', fontWeight: '500' }}>
                      📹 Join Google Meet
                    </a>
                  )}
                  {session.description && (
                    <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '8px' }}>{session.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Registrations */}
        <div>
          <h2 style={styles.sectionTitle}>Registered Entrepreneurs</h2>
          <Card style={{ padding: '0' }}>
            {mm.registrations?.length === 0 ? (
              <div style={{ padding: '24px', color: 'var(--gray-400)', fontSize: '13.5px', textAlign: 'center' }}>No registrations yet.</div>
            ) : mm.registrations?.map((r, i) => (
              <div key={r.entrepreneur_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < mm.registrations.length - 1 ? '1px solid var(--gray-50)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{r.first_name} {r.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{r.company_name} · {r.coach_name}</div>
                </div>
                {isAdmin && (
                  <button onClick={() => unregisterEntrepreneur(r.entrepreneur_id)} style={{
                    background: 'var(--red-light)', color: 'var(--red)', border: 'none',
                    borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
                  }}>Remove</button>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Add session modal */}
      <Modal open={showSessionForm} onClose={() => setShowSessionForm(false)} title="Add Session" width={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Session Title" required>
            <input style={inputStyle} value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Day 1: Keynote" />
          </FormField>
          <FormField label="Date" required>
            <input type="date" style={inputStyle} value={sessionForm.session_date} onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormField label="Start Time" required>
              <input type="time" style={inputStyle} value={sessionForm.start_time} onChange={e => setSessionForm(f => ({ ...f, start_time: e.target.value }))} />
            </FormField>
            <FormField label="End Time" required>
              <input type="time" style={inputStyle} value={sessionForm.end_time} onChange={e => setSessionForm(f => ({ ...f, end_time: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Google Meet URL">
            <input style={inputStyle} value={sessionForm.google_meet_url} onChange={e => setSessionForm(f => ({ ...f, google_meet_url: e.target.value }))} placeholder="https://meet.google.com/..." />
          </FormField>
          <FormField label="Description">
            <textarea style={{ ...inputStyle, minHeight: '70px' }} value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowSessionForm(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={saveSession} disabled={savingSession}>{savingSession ? 'Saving…' : 'Add Session'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Registration management modal */}
      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Manage Registrations" width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          {entrepreneurs.map(e => {
            const isReg = registeredIds.includes(e.id);
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: isReg ? 'var(--green-light)' : 'var(--off-white)',
                border: '1px solid', borderColor: isReg ? 'rgba(46,125,82,0.2)' : 'var(--gray-100)',
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{e.first_name} {e.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{e.company_name}</div>
                </div>
                <button onClick={() => isReg ? unregisterEntrepreneur(e.id) : registerEntrepreneur(e.id)} style={{
                  padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600',
                  border: '1.5px solid',
                  borderColor: isReg ? 'var(--green)' : 'var(--gray-200)',
                  background: isReg ? 'var(--green)' : 'var(--white)',
                  color: isReg ? 'var(--white)' : 'var(--gray-600)',
                  cursor: 'pointer',
                }}>
                  {isReg ? '✓ Registered' : 'Register'}
                </button>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Session attendee management modal */}
      {showSessionAttendees && (
        <Modal open onClose={() => setShowSessionAttendees(null)} title={`${showSessionAttendees.title} — Attendees`} width={520}>
          <div style={{ fontSize: '13px', color: 'var(--gray-400)', marginBottom: '14px' }}>
            Select registered entrepreneurs for this session and track calendar invites.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {mm.registrations?.map(r => {
              const sessionData = showSessionAttendees;
              return (
                <SessionAttendeeRow
                  key={r.entrepreneur_id}
                  registration={r}
                  session={sessionData}
                  mmId={id}
                  onAdd={addToSession}
                  onInvite={markInviteSent}
                  onRefresh={load}
                />
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SessionAttendeeRow({ registration: r, session, onAdd, onInvite, onRefresh }) {
  const [attendees, setAttendees] = useState(null);

  useEffect(() => {
    api.get(`/masterminds/sessions/${session.id}/attendees`).then(setAttendees);
  }, [session.id]);

  if (!attendees) return null;
  const att = attendees.find(a => a.entrepreneur_id === r.entrepreneur_id);
  const isAdded = !!att;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: isAdded ? 'var(--green-light)' : 'var(--off-white)',
      border: '1px solid', borderColor: isAdded ? 'rgba(46,125,82,0.2)' : 'var(--gray-100)',
    }}>
      <div>
        <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{r.first_name} {r.last_name}</div>
        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{r.company_name}</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isAdded && !att.calendar_invite_sent && (
          <button onClick={async () => { await onInvite(session.id, r.entrepreneur_id); onRefresh(); api.get(`/masterminds/sessions/${session.id}/attendees`).then(setAttendees); }}
            style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid rgba(201,122,27,0.2)', cursor: 'pointer' }}>
            📅 Send Invite
          </button>
        )}
        {isAdded && att.calendar_invite_sent && (
          <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: '600' }}>✓ Invited</span>
        )}
        {!isAdded && (
          <button onClick={async () => { await onAdd(session.id, r.entrepreneur_id); api.get(`/masterminds/sessions/${session.id}/attendees`).then(setAttendees); }}
            style={{ padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', border: '1.5px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>
            Add to Session
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: '13px', cursor: 'pointer', marginBottom: '20px', padding: '0' },
  hero: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' },
  sectionTitle: { fontSize: '15px', fontFamily: 'var(--font-display)', fontWeight: '700', marginBottom: '12px' },
};
