import React, { useEffect } from 'react';

// ── Badge ──────────────────────────────────────────────────────────────
export function Badge({ label, variant = 'default' }) {
  const map = {
    active:       { bg: 'var(--green-light)',  color: 'var(--green)',  text: 'Active' },
    cancelled:    { bg: 'var(--red-light)',    color: 'var(--red)',    text: 'Cancelled' },
    completed:    { bg: 'var(--gray-50)',      color: 'var(--gray-600)', text: 'Completed' },
    're-enrolled':{ bg: 'var(--amber-light)',  color: 'var(--amber)',  text: 'Re-enrolled' },
    upcoming:     { bg: 'var(--gray-50)',      color: 'var(--gray-600)', text: 'Upcoming' },
    shared_risk:  { bg: '#FFF4E5',            color: '#C97A1B',       text: 'Shared Risk' },
    shared_risk_review: { bg: '#FFF4E5',      color: '#C97A1B',       text: 'Risk Review' },
    admin:        { bg: 'rgba(201,168,76,0.15)', color: 'var(--gold)', text: 'Admin' },
    coach:        { bg: 'rgba(27,122,110,0.12)', color: 'var(--teal)', text: 'Coach' },
    tuesday:      { bg: 'rgba(11,31,58,0.08)', color: 'var(--navy)',  text: 'Tuesday' },
    thursday:     { bg: 'rgba(11,31,58,0.08)', color: 'var(--navy)',  text: 'Thursday' },
    default:      { bg: 'var(--gray-50)',      color: 'var(--gray-600)', text: label },
  };
  const s = map[variant?.toLowerCase()] || map.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px',
      borderRadius: '20px',
      fontSize: '11.5px',
      fontWeight: '600',
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      {label || s.text}
    </span>
  );
}

// ── Button ─────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', style: extraStyle }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-display)', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'opacity 0.15s, transform 0.1s',
    whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '9px 18px', fontSize: '13.5px' },
    lg: { padding: '12px 24px', fontSize: '15px' },
  };
  const variants = {
    primary:   { background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', color: 'var(--white)', boxShadow: 'var(--shadow-sm)' },
    gold:      { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: 'var(--navy)', boxShadow: 'var(--shadow-gold)' },
    ghost:     { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--gray-100)' },
    danger:    { background: 'var(--red-light)', color: 'var(--red)', border: '1px solid rgba(201,76,76,0.2)' },
    teal:      { background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-light) 100%)', color: 'var(--white)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...extraStyle }}>
      {children}
    </button>
  );
}

// ── Card ───────────────────────────────────────────────────────────────
export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--gray-100)',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: onClick ? 'box-shadow 0.15s, transform 0.1s' : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
      <div>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }) {
  return (
    <Card style={{ padding: '22px 24px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{label}</div>
      <div style={{ fontSize: '34px', fontFamily: 'var(--font-display)', fontWeight: '800', color: accent || 'var(--navy)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '6px' }}>{sub}</div>}
    </Card>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 560 }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={mStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...mStyles.modal, maxWidth: width }} className="animate-fade">
        <div style={mStyles.header}>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)' }}>{title}</h3>
          <button onClick={onClose} style={mStyles.closeBtn}>✕</button>
        </div>
        <div style={mStyles.body}>{children}</div>
      </div>
    </div>
  );
}

const mStyles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,61,166,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '24px',
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    height: '90vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    margin: 'auto',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--gray-100)',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'var(--gray-50)', border: 'none', borderRadius: '8px',
    width: '32px', height: '32px', cursor: 'pointer',
    color: 'var(--gray-400)', fontSize: '14px',
  },
  body: { padding: '24px', overflowY: 'auto', flex: 1 },
};

// ── FormField ──────────────────────────────────────────────────────────
export function FormField({ label, children, required, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>{hint}</span>}
    </div>
  );
}

export const inputStyle = {
  padding: '9px 12px',
  border: '1.5px solid var(--gray-100)',
  borderRadius: 'var(--radius-md)',
  fontSize: '14px',
  background: 'var(--off-white)',
  color: 'var(--navy)',
  width: '100%',
};

// ── Spinner ────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--gray-100)`,
      borderTop: `2px solid var(--gold)`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '24px', maxWidth: '340px', margin: '0 auto 24px' }}>{description}</p>
      {action}
    </div>
  );
}

// ── SearchBar ──────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div style={{ position: 'relative', width: '280px' }}>
      <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: '14px' }}>⌕</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingLeft: '32px' }}
      />
    </div>
  );
}

// ── ConfirmDialog ──────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <p style={{ color: 'var(--gray-600)', fontSize: '14px', marginBottom: '24px' }}>{message}</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={() => { onConfirm(); onClose(); }}>Delete</Btn>
      </div>
    </Modal>
  );
}
