import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, Modal, FormField, Spinner, inputStyle, StatCard } from '../components/UI';
import EntrepreneurForm from '../components/EntrepreneurForm';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Active':         { bg: '#E8F5EE', color: '#2E7D52' },
  'ECA':            { bg: '#E6F0FF', color: '#003DA6' },
  'On Break':       { bg: '#FEF3E2', color: '#C97A1B' },
  'Coaching Only':  { bg: '#E8F9FF', color: '#00ABC8' },
  'Coaching Lite':  { bg: '#F0FAFF', color: '#0080A0' },
  'Offboarded':     { bg: '#F0F2F5', color: '#4A5568' },
  'Alumni':         { bg: '#FFF4E5', color: '#C97A1B' },
  'Discontinued':   { bg: '#FDEAEA', color: '#C94C4C' },
  'MIA':            { bg: '#FFF0F0', color: '#A00000' },
};

const LIKELIHOOD_OPTIONS = ['Met', 'Very Likely', 'Unlikely', 'Not Sure', 'N/A'];
const RENEWAL_POTENTIAL_OPTIONS = [
  'Renewed on Guarantee', 'Renewed 2yr', 'Renewed 1y CO', 'Renewed 1yr',
  'Confirmed Coaching Only', 'Not renewing / continuing', 'Confirmed Full ACES Renewal',
  'Potential Coaching Only', 'Low Potential', 'Medium Potential', 'High Potential',
  'New Continuing', 'Just Renewed',
];
const GUARANTEE_ALERT_OPTIONS = ['New', 'Qualifies', 'Questionable', 'Met', 'Not Eligible', 'Waived', '$4K Shared Risk'];

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: '#F0F2F5', color: '#4A5568' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

// IMPORTANT: Do NOT use parseISO here — it shifts dates by timezone offset.
// Always parse date parts directly to avoid off-by-one day bugs.
const fmt = (d) => {
  try {
    const dateStr = d ? d.toString().split('T')[0] : '';
    const [y, m, day] = dateStr.split('-');
    return format(new Date(parseInt(y), parseInt(m) - 1, parseInt(day)), 'MMM d, yyyy');
  } catch { return d; }
};

const daysUntil = (dateStr) => {
  try {
    const [y, m, d] = dateStr.split('T')[0].split('-');
    const target = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

export default function EntrepreneurDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [ent, setEnt] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [sprintModal, setSprintModal] = useState(null);
  const [sprintForm, setSprintForm] = useState({});
  const [savingSprint, setSavingSprint] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', email: '', status: 'active' });
  const [savingPartner, setSavingPartner] = useState(false);
  const [renewalTab, setRenewalTab] = useState('shared_risk');

  const load = async () => {
    setLoading(true);
    const [e, s, p] = await Promise.all([
      api.get(`/entrepreneurs/${id}`),
      api.get(`/sprints/entrepreneur/${id}`),
      api.get(`/partners/entrepreneur/${id}`),
    ]);
    setEnt(e);
    setSprints(s);
    setPartners(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const openSprint = (sprint) => { setSprintForm({ ...sprint }); setSprintModal(sprint); };

  const saveSprint = async () => {
    setSavingSprint(true);
    try { await api.put(`/sprints/${sprintModal.id}`, sprintForm); await load(); setSprintModal(null); }
    finally { setSavingSprint(false); }
  };

  const openPartnerModal = (partner = null) => {
    setEditPartner(partner);
    setPartnerForm(partner ? { name: partner.name, email: partner.email || '', status: partner.status } : { name: '', email: '', status: 'active' });
    setShowPartnerModal(true);
  };

  const savePartner = async () => {
    setSavingPartner(true);
    try {
      if (editPartner) { await api.put(`/partners/${editPartner.id}`, partnerForm); }
      else { await api.post('/partners', { ...partnerForm, entrepreneur_id: parseInt(id) }); }
      await load(); setShowPartnerModal(false);
    } finally { setSavingPartner(false); }
  };

  const deletePartner = async (partnerId) => {
    if (!window.confirm('Remove this partner?')) return;
    await api.delete(`/partners/${partnerId}`);
    load();
  };

  const totalRevenue = sprints.reduce((sum, s) => sum + (parseFloat(s.revenue) || 0), 0);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={36} /></div>;
  if (!ent) return <div style={{ padding: '40px', color: 'var(--gray-400)' }}>Entrepreneur not found.</div>;

  // Renewal review sprints
  const sprint2 = sprints.find(s => s.sprint_number === 2);
  const sprint6 = sprints.find(s => s.sprint_number === 6);
  const days2 = sprint2 ? daysUntil(sprint2.end_date) : null;
  const days6 = sprint6 ? daysUntil(sprint6.end_date) : null;
  const showAlert2 = days2 !== null && days2 >= 0 && days2 <= 30;
  const showAlert6 = days6 !== null && days6 >= 0 && days6 <= 30;
  const hasRenewalAlert = showAlert2 || showAlert6;

  const renewalSprint = renewalTab === 'shared_risk' ? sprint2 : sprint6;

  return (
    <div>
      <button onClick={() => navigate('/entrepreneurs')} style={styles.back}>← Back to Entrepreneurs</button>

      {/* Renewal alerts banner */}
      {hasRenewalAlert && (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {showAlert2 && (
            <div style={{ ...styles.alertBanner, borderColor: days2 <= 7 ? '#C94C4C' : '#C97A1B', background: days2 <= 7 ? '#FDEAEA' : '#FEF3E2' }}>
              <span style={{ fontSize: '16px' }}>{days2 <= 7 ? '🚨' : '⚠️'}</span>
              <div>
                <strong style={{ color: days2 <= 7 ? '#C94C4C' : '#C97A1B' }}>
                  Shared Risk Review due {days2 === 0 ? 'today' : `in ${days2} day${days2 === 1 ? '' : 's'}`}
                </strong>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                  Sprint 2 ends {fmt(sprint2.end_date)} — renewal assessment required
                </div>
              </div>
              <button onClick={() => { setRenewalTab('shared_risk'); document.getElementById('renewal-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                style={styles.alertBtn}>Complete Review →</button>
            </div>
          )}
          {showAlert6 && (
            <div style={{ ...styles.alertBanner, borderColor: days6 <= 7 ? '#C94C4C' : '#003DA6', background: days6 <= 7 ? '#FDEAEA' : '#E6F0FF' }}>
              <span style={{ fontSize: '16px' }}>{days6 <= 7 ? '🚨' : '📋'}</span>
              <div>
                <strong style={{ color: days6 <= 7 ? '#C94C4C' : '#003DA6' }}>
                  Year-End Review due {days6 === 0 ? 'today' : `in ${days6} day${days6 === 1 ? '' : 's'}`}
                </strong>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                  Sprint 6 ends {fmt(sprint6.end_date)} — renewal assessment required
                </div>
              </div>
              <button onClick={() => { setRenewalTab('year_end'); document.getElementById('renewal-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                style={styles.alertBtn}>Complete Review →</button>
            </div>
          )}
        </div>
      )}

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.avatarLg}>{ent.first_name[0]}{ent.last_name[0]}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '26px', margin: 0 }}>{ent.first_name} {ent.last_name}</h1>
              {ent.is_plus && <span style={{ fontSize: '12px', fontWeight: '700', color: '#003DA6', background: '#E6F0FF', padding: '3px 10px', borderRadius: '20px' }}>Plus ✦</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {ent.company_name && <span style={{ color: 'var(--gray-400)', fontSize: '14px' }}>{ent.company_name}</span>}
              {ent.business_industry && <span style={{ color: 'var(--gray-400)', fontSize: '14px' }}>· {ent.business_industry}</span>}
              {ent.niche && <span style={{ color: 'var(--gray-600)', fontSize: '13px', fontStyle: 'italic' }}>· {ent.niche}</span>}
              <StatusBadge status={ent.status} />
            </div>
            {ent.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {ent.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="ghost" onClick={() => setShowEdit(true)}>Edit Profile</Btn>
          {ent.google_drive_url && <Btn variant="teal" onClick={() => window.open(ent.google_drive_url, '_blank')}>📁 Google Drive</Btn>}
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard label="Total Revenue Reported" value={`$${totalRevenue.toLocaleString()}`} sub="across all sprints" accent="var(--teal)" />
        <StatCard label="Sprints Completed" value={sprints.filter(s => s.status === 'completed').length} sub={`of ${sprints.length} total`} accent="var(--navy)" />
        <StatCard label="OKRs Reviewed" value={sprints.filter(s => s.okr_reviewed).length} sub="strategy calls done" accent="var(--gold)" />
        <StatCard label="Cohort" value={ent.cohort || '—'} sub="enrollment cohort" />
      </div>

      <div style={styles.twoCol}>
        {/* Left: Sprints + Renewal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Sprint Tracker */}
          <div>
            <h2 style={styles.sectionTitle}>Sprint Tracker</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sprints.length === 0 ? (
                <Card style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)' }}>No sprints generated yet.</Card>
              ) : sprints.map(sprint => (
                <Card key={sprint.id} style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: sprint.status === 'active' ? 'linear-gradient(135deg, #FFC600, #FFD740)'
                          : sprint.status === 'completed' ? 'linear-gradient(135deg, #00ABC8, #00C5E0)'
                          : 'var(--gray-100)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '14px',
                        color: sprint.status === 'upcoming' ? 'var(--gray-400)' : sprint.status === 'active' ? '#003DA6' : 'var(--white)',
                      }}>{sprint.sprint_number}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>
                          Sprint {sprint.sprint_number}
                          {sprint.is_shared_risk && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--amber)', fontWeight: '600' }}>SHARED RISK</span>}
                          {sprint.sprint_number === 6 && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#003DA6', fontWeight: '600' }}>YEAR-END</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{fmt(sprint.start_date)} → {fmt(sprint.end_date)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {sprint.revenue && <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--teal)' }}>${parseFloat(sprint.revenue).toLocaleString()}</span>}
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'var(--gray-50)', color: 'var(--gray-600)' }}>{sprint.status}</span>
                      <button onClick={() => openSprint(sprint)} style={styles.editBtn}>Edit</button>
                    </div>
                  </div>
                  {(sprint.okr_file_url || sprint.status === 'active' || sprint.status === 'completed') && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--gray-50)', marginTop: '10px', flexWrap: 'wrap' }}>
                      {sprint.okr_file_url
                        ? <a href={sprint.okr_file_url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: 'var(--navy)', fontWeight: '500', textDecoration: 'underline' }}>📄 OKR File</a>
                        : <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>No OKR file linked</span>}
                      <span style={{ fontSize: '11.5px', fontWeight: '600', color: sprint.okr_reviewed ? '#2E7D52' : 'var(--amber)', background: sprint.okr_reviewed ? '#E8F5EE' : 'var(--amber-light)', padding: '2px 8px', borderRadius: '10px' }}>
                        {sprint.okr_reviewed ? '✓ Reviewed' : '⏳ OKR Pending Review'}
                      </span>
                      {/* Show renewal summary on Sprint 2 and 6 */}
                      {(sprint.sprint_number === 2 || sprint.sprint_number === 6) && sprint.renewal_potential && (
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: '#E6F0FF', color: '#003DA6' }}>
                          {sprint.renewal_potential}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Renewal Assessment Section */}
          {(sprint2 || sprint6) && (
            <div id="renewal-section">
              <h2 style={styles.sectionTitle}>Renewal Assessment</h2>
              <Card style={{ padding: '0', overflow: 'hidden' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
                  {sprint2 && (
                    <button onClick={() => setRenewalTab('shared_risk')} style={{ ...styles.renewalTab, borderBottom: renewalTab === 'shared_risk' ? '2px solid #003DA6' : '2px solid transparent', color: renewalTab === 'shared_risk' ? '#003DA6' : 'var(--gray-400)', background: renewalTab === 'shared_risk' ? '#F7F8FA' : 'white' }}>
                      Shared Risk Review
                      {showAlert2 && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: '700', color: days2 <= 7 ? '#C94C4C' : '#C97A1B', background: days2 <= 7 ? '#FDEAEA' : '#FEF3E2', padding: '1px 6px', borderRadius: '10px' }}>{days2}d</span>}
                    </button>
                  )}
                  {sprint6 && (
                    <button onClick={() => setRenewalTab('year_end')} style={{ ...styles.renewalTab, borderBottom: renewalTab === 'year_end' ? '2px solid #003DA6' : '2px solid transparent', color: renewalTab === 'year_end' ? '#003DA6' : 'var(--gray-400)', background: renewalTab === 'year_end' ? '#F7F8FA' : 'white' }}>
                      Year-End Review
                      {showAlert6 && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: '700', color: days6 <= 7 ? '#C94C4C' : '#003DA6', background: days6 <= 7 ? '#FDEAEA' : '#E6F0FF', padding: '1px 6px', borderRadius: '10px' }}>{days6}d</span>}
                    </button>
                  )}
                </div>

                {renewalSprint ? (
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '16px' }}>
                      Sprint {renewalSprint.sprint_number} · ends {fmt(renewalSprint.end_date)}
                      {renewalSprint.renewal_completed_at && (
                        <span style={{ marginLeft: '10px', color: '#2E7D52', fontWeight: '600' }}>
                          ✓ Last updated {fmt(renewalSprint.renewal_completed_at)}
                        </span>
                      )}
                    </div>
                    <RenewalForm sprint={renewalSprint} onSave={async (fields) => {
                      await api.put(`/sprints/${renewalSprint.id}`, { ...renewalSprint, ...fields });
                      load();
                    }} />
                  </div>
                ) : (
                  <div style={{ padding: '24px', color: 'var(--gray-400)', fontSize: '13.5px', textAlign: 'center' }}>
                    No sprint data available for this review.
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Contact */}
          <div>
            <h2 style={styles.sectionTitle}>Contact</h2>
            <Card style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow label="Email" value={ent.email} href={`mailto:${ent.email}`} />
                <InfoRow label="Phone" value={ent.phone} />
                <InfoRow label="Timezone" value={ent.timezone} />
                <InfoRow label="Coach" value={ent.coach_name} />
                <InfoRow label="Enrolled" value={ent.enrollment_date ? fmt(ent.enrollment_date) : null} />
              </div>
            </Card>
          </div>

          {/* Partners */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={styles.sectionTitle}>Partners</h2>
              <Btn size="sm" variant="gold" onClick={() => openPartnerModal()}>+ Add Partner</Btn>
            </div>
            <Card style={{ padding: '0' }}>
              {partners.length === 0 ? (
                <div style={{ padding: '20px', color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center' }}>No partners added yet.</div>
              ) : partners.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < partners.length - 1 ? '1px solid var(--gray-50)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #00ABC8, #00C5E0)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{p.name}</div>
                      {p.email && <div style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>{p.email}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: p.status === 'active' ? '#E8F5EE' : 'var(--gray-50)', color: p.status === 'active' ? '#2E7D52' : 'var(--gray-400)' }}>{p.status}</span>
                    <button onClick={() => openPartnerModal(p)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => deletePartner(p.id)} style={{ ...styles.editBtn, background: 'var(--red-light)', color: 'var(--red)' }}>✕</button>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Coach Notes */}
          {ent.notes && (
            <div>
              <h2 style={styles.sectionTitle}>Coach Notes</h2>
              <Card style={{ padding: '18px 20px' }}>
                <p style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{ent.notes}</p>
              </Card>
            </div>
          )}

          {/* Renewal Notes summary — show latest from sprint 2 or 6 */}
          {(sprint2?.renewal_notes || sprint6?.renewal_notes) && (
            <div>
              <h2 style={styles.sectionTitle}>Renewal Notes</h2>
              {sprint2?.renewal_notes && (
                <Card style={{ padding: '14px 16px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#C97A1B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Shared Risk</div>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{sprint2.renewal_notes}</p>
                </Card>
              )}
              {sprint6?.renewal_notes && (
                <Card style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#003DA6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Year-End</div>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{sprint6.renewal_notes}</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EntrepreneurForm open={showEdit} onClose={() => setShowEdit(false)} onSaved={load} initial={ent} />

      <Modal open={!!sprintModal} onClose={() => setSprintModal(null)} title={`Edit Sprint ${sprintModal?.sprint_number}`} width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormField label="Start Date"><input type="date" style={inputStyle} value={sprintForm.start_date || ''} onChange={e => setSprintForm(f => ({ ...f, start_date: e.target.value }))} /></FormField>
            <FormField label="End Date"><input type="date" style={inputStyle} value={sprintForm.end_date || ''} onChange={e => setSprintForm(f => ({ ...f, end_date: e.target.value }))} /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormField label="Status">
              <select style={inputStyle} value={sprintForm.status || ''} onChange={e => setSprintForm(f => ({ ...f, status: e.target.value }))}>
                {['upcoming', 'active', 'shared_risk_review', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </FormField>
            <FormField label="Revenue Reported ($)"><input type="number" style={inputStyle} value={sprintForm.revenue || ''} onChange={e => setSprintForm(f => ({ ...f, revenue: e.target.value }))} placeholder="0.00" /></FormField>
          </div>
          {sprintForm.is_shared_risk && (
            <FormField label="Shared Risk Decision">
              <select style={inputStyle} value={sprintForm.decision_at_review || ''} onChange={e => setSprintForm(f => ({ ...f, decision_at_review: e.target.value }))}>
                <option value="">Pending</option>
                <option value="continue">Continue ✓</option>
                <option value="cancel">Cancel ✗</option>
              </select>
            </FormField>
          )}
          <FormField label="OKR File URL"><input style={inputStyle} value={sprintForm.okr_file_url || ''} onChange={e => setSprintForm(f => ({ ...f, okr_file_url: e.target.value }))} placeholder="https://docs.google.com/..." /></FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!sprintForm.okr_reviewed} onChange={e => setSprintForm(f => ({ ...f, okr_reviewed: e.target.checked }))} />
            OKR reviewed by coach
          </label>
          {sprintForm.okr_reviewed && (
            <FormField label="OKR Review Notes"><textarea style={{ ...inputStyle, minHeight: '70px' }} value={sprintForm.okr_notes || ''} onChange={e => setSprintForm(f => ({ ...f, okr_notes: e.target.value }))} /></FormField>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setSprintModal(null)}>Cancel</Btn>
            <Btn variant="gold" onClick={saveSprint} disabled={savingSprint}>{savingSprint ? 'Saving…' : 'Save Sprint'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showPartnerModal} onClose={() => setShowPartnerModal(false)} title={editPartner ? 'Edit Partner' : 'Add Partner'} width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Full Name" required><input style={inputStyle} value={partnerForm.name} onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner Name" /></FormField>
          <FormField label="Email Address"><input type="email" style={inputStyle} value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))} placeholder="partner@email.com" /></FormField>
          <FormField label="Status">
            <select style={inputStyle} value={partnerForm.status} onChange={e => setPartnerForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowPartnerModal(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={savePartner} disabled={savingPartner}>{savingPartner ? 'Saving…' : editPartner ? 'Save Changes' : 'Add Partner'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RenewalForm({ sprint, onSave }) {
  const [form, setForm] = useState({
    likelihood_guarantee: sprint.likelihood_guarantee || '',
    renewal_potential: sprint.renewal_potential || '',
    guarantee_alert: sprint.guarantee_alert || '',
    renewal_notes: sprint.renewal_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      likelihood_guarantee: sprint.likelihood_guarantee || '',
      renewal_potential: sprint.renewal_potential || '',
      guarantee_alert: sprint.guarantee_alert || '',
      renewal_notes: sprint.renewal_notes || '',
    });
  }, [sprint.id]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  };

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={grid2}>
        <FormField label="Likelihood to Meet $4K / 1yr Guarantee">
          <select style={inputStyle} value={form.likelihood_guarantee} onChange={e => setForm(f => ({ ...f, likelihood_guarantee: e.target.value }))}>
            <option value="">Select…</option>
            {LIKELIHOOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Guarantee Alert">
          <select style={inputStyle} value={form.guarantee_alert} onChange={e => setForm(f => ({ ...f, guarantee_alert: e.target.value }))}>
            <option value="">Select…</option>
            {GUARANTEE_ALERT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Renewal Potential">
        <select style={inputStyle} value={form.renewal_potential} onChange={e => setForm(f => ({ ...f, renewal_potential: e.target.value }))}>
          <option value="">Select…</option>
          {RENEWAL_POTENTIAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </FormField>
      <FormField label="Renewal Notes" hint="Separate from coach notes — renewal context only">
        <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={form.renewal_notes} onChange={e => setForm(f => ({ ...f, renewal_notes: e.target.value }))} placeholder="Notes about renewal likelihood, conversations, concerns…" />
      </FormField>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Btn variant="gold" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Assessment'}</Btn>
        {saved && <span style={{ fontSize: '13px', color: '#2E7D52', fontWeight: '600' }}>✓ Saved</span>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, href }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
      <span style={{ color: 'var(--gray-400)', fontWeight: '500' }}>{label}</span>
      {href && value
        ? <a href={href} style={{ color: 'var(--navy)', fontWeight: '500' }}>{value}</a>
        : <span style={{ color: value ? 'var(--navy)' : 'var(--gray-200)', fontWeight: value ? '500' : '400' }}>{value || '—'}</span>
      }
    </div>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: '13px', cursor: 'pointer', marginBottom: '20px', padding: '0' },
  hero: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  heroLeft: { display: 'flex', alignItems: 'flex-start', gap: '16px' },
  avatarLg: { width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg, #003DA6, #0050cc)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' },
  sectionTitle: { fontSize: '14px', fontWeight: '700', marginBottom: '10px', margin: '0 0 10px 0' },
  tag: { background: 'var(--gray-50)', color: 'var(--gray-600)', padding: '2px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '500', border: '1px solid var(--gray-100)' },
  editBtn: { background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: 'var(--gray-600)' },
  alertBanner: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '10px', border: '1.5px solid', flexWrap: 'wrap' },
  alertBtn: { marginLeft: 'auto', background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', color: '#003DA6', whiteSpace: 'nowrap' },
  renewalTab: { flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s', fontFamily: 'var(--font-body)' },
};
