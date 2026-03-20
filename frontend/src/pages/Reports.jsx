import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '../components/UI';

const LIKELIHOOD_COLORS = {
  'Met':         { bg: '#E8F5EE', color: '#2E7D52' },
  'Very Likely': { bg: '#E8F9FF', color: '#00ABC8' },
  'Unlikely':    { bg: '#FDEAEA', color: '#C94C4C' },
  'Not Sure':    { bg: '#FEF3E2', color: '#C97A1B' },
  'N/A':         { bg: '#F0F2F5', color: '#8B95A8' },
};

const GUARANTEE_COLORS = {
  'Met':           { bg: '#E8F5EE', color: '#2E7D52' },
  'Qualifies':     { bg: '#E8F9FF', color: '#00ABC8' },
  'Questionable':  { bg: '#FEF3E2', color: '#C97A1B' },
  'New':           { bg: '#E6F0FF', color: '#003DA6' },
  'Not Eligible':  { bg: '#F0F2F5', color: '#8B95A8' },
  'Waived':        { bg: '#F0F2F5', color: '#8B95A8' },
  '$4K Shared Risk': { bg: '#FFF4E5', color: '#C97A1B' },
};

const RENEWAL_COLORS = {
  'High Potential':             { bg: '#E8F5EE', color: '#2E7D52' },
  'Medium Potential':           { bg: '#E8F9FF', color: '#00ABC8' },
  'Low Potential':              { bg: '#FEF3E2', color: '#C97A1B' },
  'Just Renewed':               { bg: '#E8F5EE', color: '#2E7D52' },
  'Renewed on Guarantee':       { bg: '#E8F5EE', color: '#2E7D52' },
  'Renewed 2yr':                { bg: '#E8F5EE', color: '#2E7D52' },
  'Renewed 1yr':                { bg: '#E8F5EE', color: '#2E7D52' },
  'Renewed 1y CO':              { bg: '#E8F5EE', color: '#2E7D52' },
  'Confirmed Full ACES Renewal':{ bg: '#E8F5EE', color: '#2E7D52' },
  'Confirmed Coaching Only':    { bg: '#E6F0FF', color: '#003DA6' },
  'Potential Coaching Only':    { bg: '#E6F0FF', color: '#003DA6' },
  'New Continuing':             { bg: '#E6F0FF', color: '#003DA6' },
  'Not renewing / continuing':  { bg: '#FDEAEA', color: '#C94C4C' },
};

function Pill({ value, colorMap }) {
  if (!value) return <span style={{ color: '#C8CDD8', fontSize: '12px' }}>—</span>;
  const s = colorMap?.[value] || { bg: '#F0F2F5', color: '#4A5568' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  );
}

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const [y, m, day] = d.toString().split('T')[0].split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${parseInt(day)}, ${y}`;
  } catch { return d; }
};

export default function Reports() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('shared_risk');
  const [filterCoach, setFilterCoach] = useState('all');
  const [filterRenewal, setFilterRenewal] = useState('all');
  const [filterGuarantee, setFilterGuarantee] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/reports/renewal'),
      isAdmin ? api.get('/auth/coaches') : Promise.resolve([]),
    ]).then(([r, c]) => {
      setData(r);
      setCoaches(c);
    }).finally(() => setLoading(false));
  }, [isAdmin]);

  const isSharedRisk = tab === 'shared_risk';
  const prefix = isSharedRisk ? 'sr' : 'ye';

  const filtered = useMemo(() => {
    return data.filter(row => {
      const renewal = row[`${prefix}_renewal_potential`];
      const guarantee = row[`${prefix}_guarantee_alert`];
      const coachMatch = filterCoach === 'all' || row.coach_name === filterCoach;
      const renewalMatch = filterRenewal === 'all' || renewal === filterRenewal;
      const guaranteeMatch = filterGuarantee === 'all' || guarantee === filterGuarantee;
      return coachMatch && renewalMatch && guaranteeMatch;
    });
  }, [data, tab, filterCoach, filterRenewal, filterGuarantee]);

  // Summary stats
  const assessed = filtered.filter(r => r[`${prefix}_renewal_potential`]).length;
  const notAssessed = filtered.filter(r => !r[`${prefix}_renewal_potential`]).length;
  const totalRevenue = filtered.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0);

  // Unique values for filters
  const uniqueRenewals = [...new Set(data.map(r => r[`${prefix}_renewal_potential`]).filter(Boolean))].sort();
  const uniqueGuarantees = [...new Set(data.map(r => r[`${prefix}_guarantee_alert`]).filter(Boolean))].sort();
  const uniqueCoaches = [...new Set(coaches.map(c => c.name))].sort();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={36} /></div>;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Renewal assessment overview for all entrepreneurs"
      />

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={statCard}>
          <div style={statLabel}>Total Entrepreneurs</div>
          <div style={{ ...statValue, color: '#003DA6' }}>{filtered.length}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Assessed</div>
          <div style={{ ...statValue, color: '#2E7D52' }}>{assessed}</div>
          <div style={statSub}>renewal filled out</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Not Assessed</div>
          <div style={{ ...statValue, color: '#C97A1B' }}>{notAssessed}</div>
          <div style={statSub}>pending review</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Total Revenue</div>
          <div style={{ ...statValue, color: '#00ABC8' }}>${totalRevenue.toLocaleString()}</div>
          <div style={statSub}>reported across sprints</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <button onClick={() => setTab('shared_risk')} style={tabBtn(tab === 'shared_risk')}>Shared Risk Review (Sprint 2)</button>
        <button onClick={() => setTab('year_end')} style={tabBtn(tab === 'year_end')}>Year-End Review (Sprint 6)</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {isAdmin && (
          <div style={filterGroup}>
            <label style={filterLabel}>Coach</label>
            <select style={filterSelect} value={filterCoach} onChange={e => setFilterCoach(e.target.value)}>
              <option value="all">All Coaches</option>
              {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div style={filterGroup}>
          <label style={filterLabel}>Renewal Potential</label>
          <select style={filterSelect} value={filterRenewal} onChange={e => setFilterRenewal(e.target.value)}>
            <option value="all">All</option>
            {uniqueRenewals.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={filterGroup}>
          <label style={filterLabel}>Guarantee Alert</label>
          <select style={filterSelect} value={filterGuarantee} onChange={e => setFilterGuarantee(e.target.value)}>
            <option value="all">All</option>
            {uniqueGuarantees.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {(filterCoach !== 'all' || filterRenewal !== 'all' || filterGuarantee !== 'all') && (
          <button onClick={() => { setFilterCoach('all'); setFilterRenewal('all'); setFilterGuarantee('all'); }}
            style={{ background: 'none', border: 'none', color: '#C94C4C', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon="📊" title="No data found" description="No entrepreneurs match the current filters." />
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#F7F8FA' }}>
                  <th style={th}>Entrepreneur</th>
                  <th style={th}>Status</th>
                  {isAdmin && <th style={th}>Coach</th>}
                  <th style={th}>{isSharedRisk ? 'SR End Date' : 'Year-End Date'}</th>
                  <th style={th}>Likelihood $4K</th>
                  <th style={th}>Guarantee Alert</th>
                  <th style={th}>Renewal Potential</th>
                  <th style={th}>Revenue</th>
                  <th style={th}>Renewal Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const endDate = isSharedRisk ? row.shared_risk_end_date : row.year_end_date;
                  const likelihood = row[`${prefix}_likelihood_guarantee`];
                  const guarantee = row[`${prefix}_guarantee_alert`];
                  const renewal = row[`${prefix}_renewal_potential`];
                  const notes = row[`${prefix}_renewal_notes`];
                  const revenue = parseFloat(row[`${prefix}_revenue`] || row.total_revenue || 0);

                  return (
                    <tr key={row.entrepreneur_id}
                      onClick={() => navigate(`/entrepreneurs/${row.entrepreneur_id}`)}
                      style={{ background: i % 2 === 0 ? 'transparent' : '#FAFBFC', cursor: 'pointer' }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={avatar}>{row.first_name?.[0]}{row.last_name?.[0]}</div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{row.first_name} {row.last_name}</div>
                            <div style={{ fontSize: '11px', color: '#8B95A8' }}>{row.company_name || row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        {row.entrepreneur_status ? (
                          <span style={{ fontSize: '11.5px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: '#E6F0FF', color: '#003DA6' }}>
                            {row.entrepreneur_status}
                          </span>
                        ) : <span style={{ color: '#C8CDD8' }}>—</span>}
                      </td>
                      {isAdmin && <td style={td}><span style={{ fontSize: '12.5px', color: '#4A5568' }}>{row.coach_name || '—'}</span></td>}
                      <td style={td}><span style={{ fontSize: '12.5px', color: '#4A5568' }}>{fmtDate(endDate)}</span></td>
                      <td style={td}><Pill value={likelihood} colorMap={LIKELIHOOD_COLORS} /></td>
                      <td style={td}><Pill value={guarantee} colorMap={GUARANTEE_COLORS} /></td>
                      <td style={td}><Pill value={renewal} colorMap={RENEWAL_COLORS} /></td>
                      <td style={td}>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#1B7A6E' }}>
                          ${revenue.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ ...td, maxWidth: '220px' }}>
                        {notes ? (
                          <span style={{ fontSize: '12px', color: '#4A5568', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {notes}
                          </span>
                        ) : <span style={{ color: '#C8CDD8', fontSize: '12px' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#8B95A8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #E2E6ED', whiteSpace: 'nowrap' };
const td = { padding: '12px 14px', borderBottom: '1px solid #F0F2F5', verticalAlign: 'middle' };
const avatar = { width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #003DA6, #0050cc)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' };
const statCard = { background: '#fff', borderRadius: '10px', padding: '16px 18px', border: '1px solid #E2E6ED' };
const statLabel = { fontSize: '11px', fontWeight: '600', color: '#8B95A8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' };
const statValue = { fontSize: '28px', fontWeight: '700', lineHeight: 1 };
const statSub = { fontSize: '11px', color: '#8B95A8', marginTop: '4px' };
const tabBtn = (active) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', border: '1.5px solid', borderColor: active ? '#003DA6' : '#E2E6ED', background: active ? '#003DA6' : '#fff', color: active ? '#fff' : '#4A5568', cursor: 'pointer' });
const filterGroup = { display: 'flex', flexDirection: 'column', gap: '4px' };
const filterLabel = { fontSize: '11px', fontWeight: '600', color: '#8B95A8', textTransform: 'uppercase', letterSpacing: '0.05em' };
const filterSelect = { padding: '7px 12px', border: '1.5px solid #E2E6ED', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#0B1F3A', cursor: 'pointer', minWidth: '160px' };
