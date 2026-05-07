import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where
} from 'firebase/firestore';

const PRESET_CATEGORIES = [
  { name: 'Groceries',     icon: '🛒', color: '#22d3a5' },
  { name: 'Food & Dining', icon: '🍽️', color: '#f59e0b' },
  { name: 'Travel',        icon: '✈️', color: '#3b82f6' },
  { name: 'School Fee',    icon: '🎓', color: '#a78bfa' },
  { name: 'Entertainment', icon: '🎬', color: '#f87171' },
  { name: 'Clothing',      icon: '👗', color: '#ec4899' },
  { name: 'Medical',       icon: '💊', color: '#34d399' },
  { name: 'Maintenance',   icon: '🔧', color: '#94a3b8' },
  { name: 'Utilities',     icon: '💡', color: '#fbbf24' },
  { name: 'Rent',          icon: '🏠', color: '#60a5fa' },
  { name: 'Insurance',     icon: '🛡️', color: '#818cf8' },
  { name: 'Investments',   icon: '📈', color: '#10b981' },
  { name: 'Subscriptions', icon: '📱', color: '#f472b6' },
  { name: 'Fuel',          icon: '⛽', color: '#fb923c' },
];

const FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly', 'One-time'];
const ICON_OPTIONS = ['🛒','🍽️','✈️','🎓','🎬','👗','💊','🔧','💡','🏠','🛡️','📈','📱','⛽','🎁','🐾','📚','🎵','💻','🏋️'];
const COLOR_OPTIONS = ['#22d3a5','#f59e0b','#3b82f6','#a78bfa','#f87171','#ec4899','#34d399','#94a3b8','#fbbf24','#60a5fa','#818cf8','#fb923c','#f472b6','#10b981'];

const emptyForm = {
  category: '', icon: '🛒', color: '#22d3a5', amount: '',
  frequency: 'Monthly', paymentDay: '', paymentDate: '', notes: '', isCustom: false
};

export default function Budget() {
  const [budgets, setBudgets]     = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [editId, setEditId]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = useState('all'); // all | monthly | yearly
  const [showCustomCat, setShowCustomCat] = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => { if (uid) fetchBudgets(); }, [uid]);

  async function fetchBudgets() {
    setLoading(true);
    try {
      const q = query(collection(db, 'budgets', uid, 'entries'));
      const snap = await getDocs(q);
      setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function openAdd() {
    setForm(emptyForm); setEditId(null);
    setShowCustomCat(false); setShowForm(true);
  }

  function openEdit(b) {
    setForm({ ...b }); setEditId(b.id);
    setShowCustomCat(false); setShowForm(true);
  }

  async function handleSave() {
    if (!form.category || !form.amount) return;
    setSaving(true);
    try {
      const data = { ...form, amount: parseFloat(form.amount), updatedAt: new Date() };
      if (editId) {
        await updateDoc(doc(db, 'budgets', uid, 'entries', editId), data);
      } else {
        await addDoc(collection(db, 'budgets', uid, 'entries'), { ...data, createdAt: new Date() });
      }
      setShowForm(false); fetchBudgets();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleDelete(id) {
    setDeleting(id);
    try { await deleteDoc(doc(db, 'budgets', uid, 'entries', id)); fetchBudgets(); }
    catch (e) { console.error(e); }
    setDeleting(null);
  }

  function selectPreset(cat) {
    setForm(f => ({ ...f, category: cat.name, icon: cat.icon, color: cat.color, isCustom: false }));
    setShowCustomCat(false);
  }

  const filtered = tab === 'all' ? budgets
    : tab === 'monthly' ? budgets.filter(b => b.frequency === 'Monthly')
    : budgets.filter(b => b.frequency === 'Yearly' || b.frequency === 'Quarterly' || b.frequency === 'One-time');

  const totalMonthly = budgets
    .filter(b => b.frequency === 'Monthly')
    .reduce((s, b) => s + (b.amount || 0), 0);
  const totalYearly = budgets
    .filter(b => b.frequency === 'Yearly')
    .reduce((s, b) => s + (b.amount || 0), 0);

  const styles = {
    page: { minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px', fontFamily: "'DM Sans', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    title: { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 },
    subtitle: { color: 'var(--muted)', fontSize: 14, marginTop: 4 },
    addBtn: { background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
    summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 },
    summaryCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' },
    summaryLabel: { color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 },
    summaryValue: { fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', marginTop: 6 },
    tabs: { display: 'flex', gap: 8, marginBottom: 24 },
    tab: (active) => ({ padding: '8px 20px', borderRadius: 10, border: '1px solid var(--border)', background: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#0a0a0f' : 'var(--muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' },
    cardAccent: (color) => ({ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '18px 18px 0 0' }),
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    catName: { fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 },
    amount: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text)' },
    freqBadge: (color) => ({ background: color + '22', color, borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }),
    meta: { color: 'var(--muted)', fontSize: 13, marginTop: 8 },
    actions: { display: 'flex', gap: 8, marginTop: 14 },
    editBtn: { flex: 1, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 9, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    delBtn: { background: '#f871711a', border: '1px solid #f8717133', color: '#f87171', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
    label: { color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' },
    input: { width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
    formGroup: { marginBottom: 18 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 12 },
    presetBtn: (active) => ({ background: active ? 'var(--accent)' : 'var(--card)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: active ? '#0a0a0f' : 'var(--text)', fontSize: 13, fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }),
    colorRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    colorDot: (c, active) => ({ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: active ? '3px solid white' : '3px solid transparent', boxSizing: 'border-box' }),
    iconRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    iconBtn: (active) => ({ background: active ? 'var(--accent)' : 'var(--card)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '6px 10px', fontSize: 18, cursor: 'pointer' }),
    modalFooter: { display: 'flex', gap: 10, marginTop: 24 },
    saveBtn: { flex: 1, background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
    cancelBtn: { background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer' },
    empty: { textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' },
  };

  const freqColor = { Monthly: '#22d3a5', Quarterly: '#f59e0b', Yearly: '#a78bfa', 'One-time': '#f87171' };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Budget Planner 📊</h1>
          <p style={styles.subtitle}>Set your expected expenses per category and frequency</p>
        </div>
        <button style={styles.addBtn} onClick={openAdd}>+ Add Budget</button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Budgets</div>
          <div style={styles.summaryValue}>{budgets.length}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>categories tracked</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Monthly Budget</div>
          <div style={{ ...styles.summaryValue, color: '#22d3a5' }}>₹{totalMonthly.toLocaleString('en-IN')}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>per month</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Yearly Budget</div>
          <div style={{ ...styles.summaryValue, color: '#a78bfa' }}>₹{totalYearly.toLocaleString('en-IN')}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>per year</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Annual Total</div>
          <div style={{ ...styles.summaryValue, color: '#f59e0b' }}>₹{(totalMonthly * 12 + totalYearly).toLocaleString('en-IN')}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>projected yearly spend</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['all', 'monthly', 'yearly'].map(t => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'monthly' ? 'Monthly' : 'Yearly & Others'}
          </button>
        ))}
      </div>

      {/* Budget Cards Grid */}
      {loading ? (
        <div style={styles.empty}>Loading budgets...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No budgets yet</div>
          <div>Click "Add Budget" to set your first expected expense</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map(b => (
            <div key={b.id} style={styles.card}>
              <div style={styles.cardAccent(b.color || '#22d3a5')} />
              <div style={styles.cardTop}>
                <div style={styles.catName}>
                  <span style={{ fontSize: 22 }}>{b.icon}</span> {b.category}
                </div>
                <span style={styles.freqBadge(freqColor[b.frequency] || '#22d3a5')}>{b.frequency}</span>
              </div>
              <div style={styles.amount}>₹{parseFloat(b.amount || 0).toLocaleString('en-IN')}</div>
              <div style={styles.meta}>
                {b.frequency === 'Monthly' && b.paymentDay && `📅 Due on day ${b.paymentDay} of every month`}
                {(b.frequency === 'Yearly' || b.frequency === 'One-time') && b.paymentDate && `📅 Due: ${b.paymentDate}`}
                {b.frequency === 'Quarterly' && b.paymentDate && `📅 Next: ${b.paymentDate}`}
                {b.notes && <div style={{ marginTop: 4 }}>📝 {b.notes}</div>}
              </div>
              <div style={styles.actions}>
                <button style={styles.editBtn} onClick={() => openEdit(b)}>✏️ Edit</button>
                <button style={styles.delBtn} onClick={() => handleDelete(b.id)} disabled={deleting === b.id}>
                  {deleting === b.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>{editId ? 'Edit Budget' : 'Add Budget Entry'}</div>

            {/* Preset Categories */}
            {!editId && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Quick Select Category</label>
                <div style={styles.presetGrid}>
                  {PRESET_CATEGORIES.map(cat => (
                    <button key={cat.name} style={styles.presetBtn(form.category === cat.name)} onClick={() => selectPreset(cat)}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                  <button style={styles.presetBtn(showCustomCat)} onClick={() => { setShowCustomCat(true); setForm(f => ({ ...f, category: '', isCustom: true })); }}>
                    ✏️ Custom...
                  </button>
                </div>
              </div>
            )}

            {/* Custom Category Name */}
            {(showCustomCat || editId) && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Category Name</label>
                <input style={styles.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Pet Care" />
              </div>
            )}

            {/* Icon & Color */}
            {(showCustomCat || editId) && (
              <div style={styles.row2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Icon</label>
                  <div style={styles.iconRow}>
                    {ICON_OPTIONS.map(ic => (
                      <button key={ic} style={styles.iconBtn(form.icon === ic)} onClick={() => setForm(f => ({ ...f, icon: ic }))}>{ic}</button>
                    ))}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Color</label>
                  <div style={styles.colorRow}>
                    {COLOR_OPTIONS.map(c => (
                      <div key={c} style={styles.colorDot(c, form.color === c)} onClick={() => setForm(f => ({ ...f, color: c }))} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Amount & Frequency */}
            <div style={styles.row2}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Budgeted Amount (₹)</label>
                <input style={styles.input} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Frequency</label>
                <select style={styles.select} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  {FREQUENCIES.map(fr => <option key={fr}>{fr}</option>)}
                </select>
              </div>
            </div>

            {/* Payment Date */}
            {form.frequency === 'Monthly' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Day (day of month, e.g. 5 for 5th)</label>
                <input style={styles.input} type="number" min="1" max="31" value={form.paymentDay} onChange={e => setForm(f => ({ ...f, paymentDay: e.target.value }))} placeholder="e.g. 5" />
              </div>
            )}
            {(form.frequency === 'Yearly' || form.frequency === 'One-time' || form.frequency === 'Quarterly') && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Date</label>
                <input style={styles.input} type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
              </div>
            )}

            {/* Notes */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes (optional)</label>
              <input style={styles.input} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. HDFC credit card grocery spends" />
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Budget' : 'Save Budget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
