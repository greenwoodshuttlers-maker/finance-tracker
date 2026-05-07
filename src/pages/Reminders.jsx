import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import {
  collection, addDoc, getDocs, updateDoc, doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';

// ─── Helpers ────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function urgencyColor(days) {
  if (days === null) return '#94a3b8';
  if (days < 0)  return '#f87171';
  if (days <= 7) return '#f87171';
  if (days <= 30) return '#f59e0b';
  return '#22d3a5';
}

function urgencyLabel(days) {
  if (days === null) return '';
  if (days < 0)  return `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return 'Due Today!';
  if (days === 1) return 'Due Tomorrow!';
  return `Due in ${days} days`;
}

function nextMonthlyDueDate(paymentDay) {
  if (!paymentDay) return null;
  const today = new Date();
  const day = parseInt(paymentDay);
  let target = new Date(today.getFullYear(), today.getMonth(), day);
  if (target < today) target = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return target.toISOString().split('T')[0];
}

function shouldRemind(dueDate, frequency) {
  const days = daysUntil(dueDate);
  if (days === null) return false;
  if (frequency === 'Monthly') return days <= 7;
  if (frequency === 'Quarterly') return days <= 30;
  return days <= 90; // Yearly & One-time
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Mark as Paid Modal ──────────────────────────────────────────────────────
function PayModal({ reminder, onClose, onDone }) {
  const [amount, setAmount]   = useState(reminder.amount || '');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const uid = auth.currentUser?.uid;

  async function handlePay() {
    if (!amount) return;
    setSaving(true);
    try {
      const txn = {
        type: 'expense',
        amount: parseFloat(amount),
        category: reminder.category || reminder.title,
        merchant: reminder.title,
        date: new Date(date),
        account: account || 'Manual',
        description: `Payment: ${reminder.title}`,
        notes,
        reminderId: reminder.id,
        createdAt: serverTimestamp(),
      };
      // Add to transactions
      await addDoc(collection(db, 'transactions', uid, 'entries'), txn);
      // Mark reminder as paid
      await updateDoc(doc(db, 'reminders', uid, 'entries', reminder.id), {
        status: 'paid',
        paidDate: date,
        paidAmount: parseFloat(amount),
        paidAccount: account,
        paidNotes: notes,
        updatedAt: serverTimestamp(),
      });
      onDone();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 460 },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
    sub: { color: 'var(--muted)', fontSize: 14, marginBottom: 24 },
    label: { color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' },
    input: { width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    footer: { display: 'flex', gap: 10, marginTop: 8 },
    payBtn: { flex: 1, background: '#22d3a5', color: '#0a0a0f', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
    cancelBtn: { background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 20px', fontWeight: 600, cursor: 'pointer' },
    highlight: { background: '#22d3a511', border: '1px solid #22d3a533', borderRadius: 12, padding: '12px 16px', marginBottom: 20 },
    hlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    hlTitle: { color: 'var(--text)', fontWeight: 700 },
    hlAmt: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#22d3a5' },
  };

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        <div style={s.title}>✅ Mark as Paid</div>
        <div style={s.sub}>This will save a transaction entry and move to history.</div>
        <div style={s.highlight}>
          <div style={s.hlRow}>
            <div style={s.hlTitle}>{reminder.icon} {reminder.title}</div>
            <div style={s.hlAmt}>₹{parseFloat(reminder.amount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            {reminder.frequency} · Due {formatDate(reminder.dueDate)}
          </div>
        </div>

        <div style={s.row2}>
          <div>
            <label style={s.label}>Amount Paid (₹)</label>
            <input style={s.input} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label style={s.label}>Payment Date</label>
            <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <label style={s.label}>Payment Account / Card</label>
        <input style={s.input} value={account} onChange={e => setAccount(e.target.value)} placeholder="e.g. HDFC Credit Card, GPay" />

        <label style={s.label}>Notes (optional)</label>
        <input style={s.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks..." />

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.payBtn} onClick={handlePay} disabled={saving}>
            {saving ? 'Saving...' : '✅ Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reminder Card ───────────────────────────────────────────────────────────
function ReminderCard({ r, onPay }) {
  const days = daysUntil(r.dueDate);
  const color = urgencyColor(days);
  const label = urgencyLabel(days);

  const s = {
    card: { background: 'var(--surface)', border: `1px solid ${color}33`, borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden' },
    stripe: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: color, borderRadius: '18px 0 0 18px' },
    top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginLeft: 14 },
    left: {},
    name: { fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 },
    source: { color: 'var(--muted)', fontSize: 12, marginTop: 2 },
    amount: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text)' },
    badge: { background: color + '22', color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, marginLeft: 14, marginTop: 10, display: 'inline-block' },
    dueDate: { color: 'var(--muted)', fontSize: 13, marginLeft: 14, marginTop: 4 },
    payBtn: { marginTop: 14, marginLeft: 14, background: '#22d3a5', color: '#0a0a0f', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  };

  return (
    <div style={s.card}>
      <div style={s.stripe} />
      <div style={s.top}>
        <div style={s.left}>
          <div style={s.name}><span style={{ fontSize: 20 }}>{r.icon}</span>{r.title}</div>
          <div style={s.source}>{r.sourceLabel}</div>
        </div>
        <div style={s.amount}>₹{parseFloat(r.amount || 0).toLocaleString('en-IN')}</div>
      </div>
      <div style={s.badge}>{label}</div>
      <div style={s.dueDate}>📅 Due: {formatDate(r.dueDate)} · {r.frequency}</div>
      <button style={s.payBtn} onClick={() => onPay(r)}>✅ Mark as Paid</button>
    </div>
  );
}

// ─── History Card ────────────────────────────────────────────────────────────
function HistoryCard({ r }) {
  const s = {
    card: { background: 'var(--surface)', border: '1px solid #22d3a533', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    left: {},
    name: { fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 },
    meta: { color: 'var(--muted)', fontSize: 13, marginTop: 4 },
    right: { textAlign: 'right' },
    amount: { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: '#22d3a5' },
    paid: { color: '#22d3a5', fontSize: 13, fontWeight: 600, marginTop: 4 },
  };
  return (
    <div style={s.card}>
      <div style={s.left}>
        <div style={s.name}><span style={{ fontSize: 18 }}>{r.icon}</span>{r.title}</div>
        <div style={s.meta}>{r.frequency} · {r.sourceLabel}</div>
        {r.paidAccount && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>via {r.paidAccount}</div>}
      </div>
      <div style={s.right}>
        <div style={s.amount}>₹{parseFloat(r.paidAmount || r.amount || 0).toLocaleString('en-IN')}</div>
        <div style={s.paid}>✅ Paid on {formatDate(r.paidDate)}</div>
      </div>
    </div>
  );
}

// ─── Main Reminders Page ─────────────────────────────────────────────────────
export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('upcoming');
  const [payTarget, setPayTarget] = useState(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => { if (uid) generateReminders(); }, [uid]);

  async function generateReminders() {
    setLoading(true);
    try {
      // 1. Fetch budgets
      const budgetSnap = await getDocs(collection(db, 'budgets', uid, 'entries'));
      const budgets = budgetSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Fetch insurance
      const insSnap = await getDocs(collection(db, 'insurance', uid, 'entries'));
      const insurance = insSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Fetch existing reminders from Firestore
      const remSnap = await getDocs(collection(db, 'reminders', uid, 'entries'));
      const existing = {};
      remSnap.docs.forEach(d => { existing[d.id] = { id: d.id, ...d.data() }; });

      const toSave = [];

      // Generate from budgets
      for (const b of budgets) {
        let dueDate = null;
        if (b.frequency === 'Monthly' && b.paymentDay) dueDate = nextMonthlyDueDate(b.paymentDay);
        else if (b.paymentDate) dueDate = b.paymentDate;
        if (!dueDate) continue;
        if (!shouldRemind(dueDate, b.frequency)) continue;

        const key = `budget_${b.id}`;
        const found = Object.values(existing).find(r => r.sourceType === 'budget' && r.sourceId === b.id && r.status !== 'paid');
        if (!found) {
          toSave.push({ title: b.category, icon: b.icon || '📋', color: b.color || '#22d3a5', amount: b.amount, frequency: b.frequency, dueDate, sourceType: 'budget', sourceId: b.id, sourceLabel: 'Budget Planner', category: b.category, status: 'pending', createdAt: serverTimestamp() });
        }
      }

      // Generate from insurance renewals
      for (const ins of insurance) {
        if (!ins.renewalDate) continue;
        const dueDate = typeof ins.renewalDate === 'string' ? ins.renewalDate : ins.renewalDate?.toDate?.()?.toISOString?.()?.split('T')[0];
        if (!dueDate) continue;
        if (!shouldRemind(dueDate, 'Yearly')) continue;
        const found = Object.values(existing).find(r => r.sourceType === 'insurance' && r.sourceId === ins.id && r.status !== 'paid');
        if (!found) {
          toSave.push({ title: `${ins.planName || ins.provider} Renewal`, icon: '🛡️', color: '#818cf8', amount: ins.premium || 0, frequency: 'Yearly', dueDate, sourceType: 'insurance', sourceId: ins.id, sourceLabel: `Insurance · ${ins.type}`, category: 'Insurance', status: 'pending', createdAt: serverTimestamp() });
        }
      }

      // Save new reminders to Firestore
      for (const r of toSave) {
        const ref = await addDoc(collection(db, 'reminders', uid, 'entries'), r);
        existing[ref.id] = { id: ref.id, ...r };
      }

      setReminders(Object.values(existing));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function handlePaid() {
    setPayTarget(null);
    generateReminders();
  }

  const pending  = reminders.filter(r => r.status !== 'paid').sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const thisMonth = pending.filter(r => {
    const days = daysUntil(r.dueDate);
    return days !== null && days >= 0 && days <= 31;
  });
  const history  = reminders.filter(r => r.status === 'paid').sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  const overdueCount = pending.filter(r => (daysUntil(r.dueDate) || 0) < 0).length;
  const dueSoonCount = pending.filter(r => { const d = daysUntil(r.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const styles = {
    page: { minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px', fontFamily: "'DM Sans', sans-serif" },
    header: { marginBottom: 32 },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 },
    subtitle: { color: 'var(--muted)', fontSize: 14, marginTop: 4 },
    alertRow: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' },
    alert: (color) => ({ background: color + '15', border: `1px solid ${color}44`, borderRadius: 12, padding: '10px 18px', color, fontWeight: 700, fontSize: 14 }),
    tabs: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
    tab: (active) => ({ padding: '9px 22px', borderRadius: 10, border: '1px solid var(--border)', background: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#0a0a0f' : 'var(--muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
    list: { display: 'flex', flexDirection: 'column', gap: 12 },
    empty: { textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' },
    sectionTitle: { fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  };

  const tabData = tab === 'upcoming' ? pending : tab === 'thismonth' ? thisMonth : history;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Smart Reminders 🔔</h1>
        <p style={styles.subtitle}>Auto-generated from your budgets, insurance, and investments</p>
        <div style={styles.alertRow}>
          {overdueCount > 0 && <div style={styles.alert('#f87171')}>🚨 {overdueCount} Overdue</div>}
          {dueSoonCount > 0 && <div style={styles.alert('#f59e0b')}>⚠️ {dueSoonCount} Due within 7 days</div>}
          {thisMonth.length > 0 && <div style={styles.alert('#22d3a5')}>📅 {thisMonth.length} due this month</div>}
          {history.length > 0 && <div style={styles.alert('#818cf8')}>✅ {history.length} paid</div>}
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={styles.tab(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
          Upcoming {pending.length > 0 && `(${pending.length})`}
        </button>
        <button style={styles.tab(tab === 'thismonth')} onClick={() => setTab('thismonth')}>
          Due This Month {thisMonth.length > 0 && `(${thisMonth.length})`}
        </button>
        <button style={styles.tab(tab === 'history')} onClick={() => setTab('history')}>
          History {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {loading ? (
        <div style={styles.empty}>🔄 Scanning your budgets, insurance &amp; investments...</div>
      ) : tabData.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{tab === 'history' ? '📂' : '🎉'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {tab === 'history' ? 'No payment history yet' : 'No reminders right now'}
          </div>
          <div>
            {tab === 'history'
              ? 'Paid reminders will appear here'
              : 'Add budgets with payment dates to get smart reminders'}
          </div>
        </div>
      ) : tab === 'history' ? (
        <div style={styles.list}>
          {tabData.map(r => <HistoryCard key={r.id} r={r} />)}
        </div>
      ) : (
        <div style={styles.grid}>
          {tabData.map(r => <ReminderCard key={r.id} r={r} onPay={setPayTarget} />)}
        </div>
      )}

      {payTarget && <PayModal reminder={payTarget} onClose={() => setPayTarget(null)} onDone={handlePaid} />}
    </div>
  );
}
