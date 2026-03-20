import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Badge, Btn, SearchBar, EmptyState, Spinner, ConfirmDialog } from '../components/UI';
import EntrepreneurForm from '../components/EntrepreneurForm';

const STATUSES = ['Active', 'ECA', 'On Break', 'Coaching Only', 'Coaching Lite', 'Offboarded', 'Alumni', 'Discontinued', 'MIA'];

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

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: '#F0F2F5', color: '#4A5568' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 9px',
      borderRadius: '20px', fontSize: '11.5px', fontWeight: '600',
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{status}</span>
  );
}

export default function Entrepreneurs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entrepreneurs, setEntrepreneurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.get('/entrepreneurs').then(setEntrepreneurs).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    return entrepreneurs.filter(e => {
      const matchSearch = !search || [e.first_name, e.last_name, e.email, e.company_name, e.coach_name]
        .join(' ').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [entrepreneurs, search, statusFilter]);

  const handleDelete = async () => {
    await api.delete(`/entrepreneurs/${deleteTarget.id}`);
    load();
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
      if (lines.length < 2) {
        setImportResult({ error: 'CSV must have a header row and at least one data row.' });
        setImporting(false);
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
      let imported = 0, failed = 0, errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const payload = {
          first_name: row.first_name || row.firstname || row.first || '',
          last_name: row.last_name || row.lastname || row.last || '',
          email: row.email || row.email_address || '',
          phone: row.phone || row.phone_number || '',
          company_name: row.company || row.company_name || row.business || '',
          business_industry: row.industry || row.business_industry || '',
          timezone: row.timezone || row.time_zone || '',
          cohort: row.cohort || '',
          status: row.status || 'Active',
          enrollment_date: row.enrollment_date || row.start_date || '',
          google_drive_url: row.google_drive_url || row.drive_url || row.google_drive || '',
          notes: row.notes || row.coach_notes || '',
          tags: row.tags ? row.tags.split(';').map(t => t.trim()) : [],
          is_plus: row.is_plus === 'true' || row.is_plus === '1' || row.plus === 'yes',
        };

        if (!payload.first_name || !payload.email) {
          failed++;
          errors.push(`Row ${i + 1}: missing first name or email`);
          continue;
        }

        try {
          await api.post('/entrepreneurs', payload);
          imported++;
        } catch (err) {
          failed++;
          errors.push(`Row ${i + 1} (${payload.email}): ${err.message}`);
        }
      }

      setImportResult({ imported, failed, errors });
      setImporting(false);
      if (imported > 0) load();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <PageHeader
        title="Entrepreneurs"
        subtitle={`${entrepreneurs.length} total · ${entrepreneurs.filter(e => e.status === 'Active').length} active`}
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn variant="ghost" onClick={() => fileRef.current.click()} disabled={importing}>
              {importing ? 'Importing…' : '⬆ Import CSV'}
            </Btn>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
            <Btn variant="gold" onClick={() => setShowForm(true)}>+ Add Entrepreneur</Btn>
          </div>
        }
      />

      {/* CSV import result */}
      {importResult && (
        <div style={{
          marginBottom: '16px', padding: '14px 18px', borderRadius: '10px',
          background: importResult.error ? 'var(--red-light)' : '#E8F5EE',
          border: `1px solid ${importResult.error ? 'rgba(201,76,76,0.2)' : 'rgba(46,125,82,0.2)'}`,
          fontSize: '13.5px',
        }}>
          {importResult.error ? (
            <span style={{ color: 'var(--red)' }}>❌ {importResult.error}</span>
          ) : (
            <div>
              <div style={{ color: '#2E7D52', fontWeight: '600', marginBottom: importResult.errors?.length ? '8px' : '0' }}>
                ✓ Import complete — {importResult.imported} imported, {importResult.failed} failed
              </div>
              {importResult.errors?.map((e, i) => (
                <div key={i} style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>• {e}</div>
              ))}
            </div>
          )}
          <button onClick={() => setImportResult(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--gray-400)', marginTop: '-2px' }}>✕</button>
        </div>
      )}

      {/* CSV format hint */}
      <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--gray-400)' }}>
        CSV columns: <code style={{ background: 'var(--gray-50)', padding: '1px 5px', borderRadius: '4px' }}>first_name, last_name, email, phone, company_name, industry, timezone, cohort, status, enrollment_date, google_drive_url, notes, tags (semicolon-separated), is_plus</code>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, company…" />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setStatusFilter('all')} style={filterBtn(statusFilter === 'all')}>All</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={filterBtn(statusFilter === s)}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No entrepreneurs found"
          description={search ? 'Try adjusting your search.' : 'Add your first entrepreneur to get started.'}
          action={<Btn variant="gold" onClick={() => setShowForm(true)}>+ Add Entrepreneur</Btn>}
        />
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--off-white)' }}>
                {['Entrepreneur', 'Company', 'Industry', 'Sprint', 'Status', 'Membership', 'Coach', ''].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} onClick={() => navigate(`/entrepreneurs/${e.id}`)}
                  style={{ ...styles.tr, background: i % 2 === 0 ? 'transparent' : 'rgba(247,248,250,0.5)' }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={styles.avatar}>{e.first_name[0]}{e.last_name[0]}</div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{e.first_name} {e.last_name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}><span style={{ fontSize: '13px' }}>{e.company_name || '—'}</span></td>
                  <td style={styles.td}><span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{e.business_industry || '—'}</span></td>
                  <td style={styles.td}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                      {e.current_sprint ? `Sprint ${e.current_sprint}` : '—'}
                    </span>
                  </td>
                  <td style={styles.td}><StatusBadge status={e.status} /></td>
                  <td style={styles.td}>
                    {e.is_plus ? (
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#003DA6' }}>Plus ✦</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontSize: '12.5px', color: 'var(--gray-600)' }}>{e.coach_name || '—'}</span>
                  </td>
                  <td style={styles.td} onClick={e2 => e2.stopPropagation()}>
                    {isAdmin && (
                      <button onClick={() => setDeleteTarget(e)} style={styles.deleteBtn}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <EntrepreneurForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Entrepreneur"
        message={`Are you sure you want to delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`}
      />
    </div>
  );
}

const filterBtn = (active) => ({
  padding: '6px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '600',
  border: '1.5px solid',
  borderColor: active ? '#003DA6' : 'var(--gray-100)',
  background: active ? '#003DA6' : 'var(--white)',
  color: active ? 'var(--white)' : 'var(--gray-600)',
  cursor: 'pointer',
});

const styles = {
  th: { padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid var(--gray-100)' },
  tr: { cursor: 'pointer', transition: 'background 0.1s' },
  td: { padding: '13px 16px', borderBottom: '1px solid var(--gray-50)', verticalAlign: 'middle' },
  avatar: {
    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #003DA6, #0050cc)',
    color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700',
  },
  deleteBtn: {
    background: 'var(--red-light)', color: 'var(--red)', border: 'none',
    borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '12px',
  },
};
