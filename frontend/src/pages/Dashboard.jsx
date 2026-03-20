import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Badge, Spinner } from '../components/UI';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [entrepreneurs, setEntrepreneurs] = useState([]);
  const [labCalls, setLabCalls] = useState([]);
  const [masterminds, setMasterminds] = useState([]);
  const [renewalAlerts, setRenewalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/entrepreneurs/meta/stats'),
      api.get('/entrepreneurs'),
      api.get('/lab-calls?upcoming=true'),
      api.get('/masterminds'),
      api.get('/entrepreneurs/meta/renewal-alerts'),
    ]).then(([s, e, lc, mm, ra]) => {
      setStats(s);
      setEntrepreneurs(e.slice(0, 6));
      setLabCalls(lc.slice(0, 4));
      setMasterminds(mm.filter(m => m.status !== 'completed').slice(0, 3));
      setRenewalAlerts(ra);
    }).finally(() => setLoading(false));
  }, []);

  // IMPORTANT: Do NOT use parseISO — it shifts dates by timezone offset
  const fmtDate = (d) => {
    try {
      const [y,m,day] = d.split('T')[0].split('-');
      return format(new Date(parseInt(y), parseInt(m)-1, parseInt(day)), 'MMM d');
    } catch { return d; }
  };

  const dayLabel = (dateStr) => {
    try {
      const [y,m,d] = dateStr.split('T')[0].split('-');
      const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
      const today = new Date(); today.setHours(0,0,0,0);
      const diff = Math.ceil((date - today) / (1000*60*60*24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return format(date, 'MMM d');
    } catch { return dateStr; }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
      <Spinner size={32} />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Header */}
      <div style={styles.welcome}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · ACES Program Dashboard
          </p>
        </div>
      </div>

      {/* Renewal Alerts */}
      {renewalAlerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#C94C4C', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🚨 Renewal Reviews Required ({renewalAlerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {renewalAlerts.map(a => (
              <div key={`${a.id}-${a.sprint_number}`} onClick={() => navigate(`/entrepreneurs/${a.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '10px', background: a.days_remaining <= 7 ? '#FDEAEA' : '#FEF3E2', border: `1.5px solid ${a.days_remaining <= 7 ? 'rgba(201,76,76,0.3)' : 'rgba(201,122,27,0.3)'}`, cursor: 'pointer', flexWrap: 'wrap' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #003DA6, #0050cc)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                  {a.first_name?.[0]}{a.last_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{a.first_name} {a.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{a.company_name} · Coach: {a.coach_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: a.days_remaining <= 7 ? '#C94C4C' : '#C97A1B' }}>
                    {a.review_type}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--gray-600)' }}>
                    {a.days_remaining === 0 ? 'Due today' : `${a.days_remaining} days left`} · ends {fmtDate(a.end_date)}
                  </div>
                </div>
                {a.renewal_potential ? (
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: '#E6F0FF', color: '#003DA6', whiteSpace: 'nowrap' }}>
                    {a.renewal_potential}
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: '#FDEAEA', color: '#C94C4C', whiteSpace: 'nowrap' }}>
                    Not assessed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Entrepreneurs" value={stats?.total} sub="in your program" accent="var(--navy)" />
        <StatCard label="Active" value={stats?.active} sub="currently enrolled" accent="var(--teal)" />
        <StatCard label="Shared Risk Period" value={entrepreneurs.filter(e => e.current_sprint <= 2).length} sub="first 4 months" accent="var(--amber)" />
        <StatCard label="Re-enrolled" value={stats?.re_enrolled} sub="renewed after year 1" accent="var(--gold)" />
      </div>

      {/* Two-column lower section */}
      <div style={styles.twoCol}>
        {/* Recent entrepreneurs */}
        <div>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Your Entrepreneurs</h2>
            <button onClick={() => navigate('/entrepreneurs')} style={styles.seeAll}>See all →</button>
          </div>
          <Card>
            {entrepreneurs.length === 0 ? (
              <div style={styles.emptyMsg}>No entrepreneurs yet.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Sprint</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entrepreneurs.map((e, i) => (
                    <tr key={e.id} onClick={() => navigate(`/entrepreneurs/${e.id}`)}
                      style={{ ...styles.tr, background: i % 2 === 0 ? 'transparent' : 'var(--off-white)' }}>
                      <td style={styles.td}>
                        <div style={styles.nameCell}>
                          <div style={styles.initials}>{e.first_name[0]}{e.last_name[0]}</div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{e.first_name} {e.last_name}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}><span style={{ fontSize: '13px' }}>{e.company_name || '—'}</span></td>
                      <td style={styles.td}>
                        {e.current_sprint ? (
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>Sprint {e.current_sprint}</span>
                        ) : <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>—</span>}
                      </td>
                      <td style={styles.td}><Badge variant={e.status} label={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Upcoming Lab Calls */}
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Upcoming Lab Calls</h2>
              <button onClick={() => navigate('/lab-calls')} style={styles.seeAll}>See all →</button>
            </div>
            <Card style={{ padding: '8px 0' }}>
              {labCalls.length === 0 ? (
                <div style={styles.emptyMsg}>No upcoming calls.</div>
              ) : labCalls.map(lc => (
                <div key={lc.id} style={styles.labCallRow} onClick={() => navigate('/lab-calls')}>
                  <div style={styles.labCallDate}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)' }}>{dayLabel(lc.call_date)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>11:00 AM ET</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '500' }}>{lc.topic || 'Lab Call'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{lc.day_of_week} · {lc.registered_count || 0} registered</div>
                  </div>
                  <Badge variant={lc.day_of_week?.toLowerCase()} label={lc.day_of_week} />
                </div>
              ))}
            </Card>
          </div>

          {/* Upcoming Masterminds */}
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Masterminds</h2>
              <button onClick={() => navigate('/masterminds')} style={styles.seeAll}>See all →</button>
            </div>
            <Card style={{ padding: '8px 0' }}>
              {masterminds.length === 0 ? (
                <div style={styles.emptyMsg}>No upcoming masterminds.</div>
              ) : masterminds.map(mm => (
                <div key={mm.id} style={styles.labCallRow} onClick={() => navigate(`/masterminds/${mm.id}`)}>
                  <div style={styles.labCallDate}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--teal)' }}>{format(parseISO(mm.start_date), 'MMM d')}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>2 days</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '500' }}>{mm.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{mm.registrations || 0} registered</div>
                  </div>
                  <Badge variant={mm.status} label={mm.status} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  welcome: { marginBottom: '28px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  sectionTitle: { fontSize: '16px', fontFamily: 'var(--font-display)', fontWeight: '700' },
  seeAll: { background: 'none', border: 'none', color: 'var(--gold)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid var(--gray-100)' },
  tr: { cursor: 'pointer', transition: 'background 0.1s' },
  td: { padding: '12px 16px', fontSize: '13.5px', borderBottom: '1px solid var(--gray-50)' },
  nameCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  initials: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
    color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', flexShrink: 0,
  },
  labCallRow: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '12px 16px', cursor: 'pointer', transition: 'background 0.1s',
    borderBottom: '1px solid var(--gray-50)',
  },
  labCallDate: { textAlign: 'center', minWidth: '56px' },
  emptyMsg: { padding: '24px', color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center' },
};
