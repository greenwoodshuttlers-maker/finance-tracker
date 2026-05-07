import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// ─── Styles ──────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090f;--surface:#0f1420;--card:#141927;--border:rgba(255,255,255,0.07);
  --accent:#22d3a5;--accent2:#3b82f6;--accent3:#f59e0b;--accent4:#a78bfa;
  --red:#f87171;--green:#34d399;--text:#f1f5f9;--muted:#64748b;--muted2:#94a3b8;
  --font-head:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font-body)}
.inv-page{max-width:1200px;margin:0 auto;padding:32px 24px}
.inv-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;gap:16px;flex-wrap:wrap}
.inv-title{font-family:var(--font-head);font-size:28px;font-weight:800;letter-spacing:-0.5px}
.inv-title span{color:var(--accent)}
.inv-subtitle{color:var(--muted2);font-size:14px;margin-top:4px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;font-family:var(--font-body);font-size:14px;font-weight:500;cursor:pointer;transition:all .2s}
.btn-primary{background:var(--accent);color:#07090f}
.btn-primary:hover{background:#1fbd95;transform:translateY(-1px)}
.btn-ghost{background:rgba(255,255,255,0.05);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{background:rgba(255,255,255,0.1)}
.btn-danger{background:rgba(248,113,113,0.1);color:var(--red);border:1px solid rgba(248,113,113,0.2)}
.btn-danger:hover{background:rgba(248,113,113,0.2)}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:7px}

/* Summary cards */
.summary-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px}
.scard{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
.scard-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px}
.scard-value{font-family:var(--font-head);font-size:22px;font-weight:700}
.scard-sub{font-size:12px;color:var(--muted2);margin-top:4px}
.pos{color:var(--green)}.neg{color:var(--red)}

/* Tabs */
.tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:24px;background:var(--surface);padding:6px;border-radius:14px;border:1px solid var(--border)}
.tab{padding:8px 16px;border-radius:10px;border:none;background:transparent;color:var(--muted);font-family:var(--font-body);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.tab.active{background:var(--card);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,0.3)}
.tab:hover:not(.active){color:var(--text)}

/* Table */
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.table-head{display:grid;padding:12px 20px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.table-row{display:grid;padding:16px 20px;border-bottom:1px solid var(--border);align-items:center;transition:background .15s}
.table-row:last-child{border-bottom:none}
.table-row:hover{background:rgba(255,255,255,0.02)}
.table-empty{padding:48px;text-align:center;color:var(--muted)}
.table-empty-icon{font-size:40px;margin-bottom:12px}
.tag{display:inline-block;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:600}

/* Modal */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:var(--card);border:1px solid var(--border);border-radius:20px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6)}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:24px 28px;border-bottom:1px solid var(--border)}
.modal-title{font-family:var(--font-head);font-size:18px;font-weight:700}
.modal-body{padding:24px 28px;display:flex;flex-direction:column;gap:16px}
.modal-footer{padding:16px 28px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group.full{grid-column:1/-1}
label{font-size:12px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em}
input,select,textarea{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:10px 14px;color:var(--text);font-family:var(--font-body);font-size:14px;outline:none;transition:border .2s;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--accent)}
select option{background:var(--card)}
.calc-box{background:var(--surface);border:1px solid rgba(34,211,165,0.2);border-radius:12px;padding:16px;margin-top:4px}
.calc-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:10px}
.calc-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
.calc-row span:last-child{font-weight:600;color:var(--text)}
.calc-total{border-top:1px solid var(--border);margin-top:8px;padding-top:8px;font-size:14px;font-weight:700;color:var(--accent)}
.close-btn{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center}
.close-btn:hover{color:var(--text);background:rgba(255,255,255,0.05)}
@media(max-width:600px){.form-row{grid-template-columns:1fr}.inv-page{padding:20px 16px}}
`;

// ─── Field definitions per category ──────────────────────────────────────────
const CATEGORY_FIELDS = {
  Equity: [
    { key:"stockName", label:"Stock Name", type:"text", required:true, placeholder:"e.g. Reliance Industries" },
    { key:"exchange", label:"Exchange", type:"select", options:["NSE","BSE","NSE/BSE"], required:true },
    { key:"ticker", label:"Ticker Symbol", type:"text", placeholder:"e.g. RELIANCE" },
    { key:"quantity", label:"Quantity (Shares)", type:"number", required:true },
    { key:"avgBuyPrice", label:"Avg. Buy Price (₹)", type:"number", required:true },
    { key:"currentPrice", label:"Current Price (₹)", type:"number", required:true },
    { key:"sector", label:"Sector", type:"text", placeholder:"e.g. Energy, Banking" },
    { key:"buyDate", label:"Purchase Date", type:"date" },
    { key:"brokerName", label:"Broker", type:"text", placeholder:"e.g. Zerodha, Groww" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  "Mutual Funds": [
    { key:"fundName", label:"Fund Name", type:"text", required:true, placeholder:"e.g. Mirae Asset Large Cap Fund" },
    { key:"fundHouse", label:"Fund House / AMC", type:"text", required:true, placeholder:"e.g. Mirae Asset" },
    { key:"category", label:"Fund Category", type:"select", options:["Large Cap","Mid Cap","Small Cap","Flexi Cap","ELSS","Debt","Hybrid","Index","International","Sectoral"], required:true },
    { key:"units", label:"Units Held", type:"number", required:true },
    { key:"nav", label:"Current NAV (₹)", type:"number", required:true },
    { key:"avgNav", label:"Avg. Buy NAV (₹)", type:"number", required:true },
    { key:"investedAmount", label:"Invested Amount (₹)", type:"number", required:true },
    { key:"sipAmount", label:"SIP Amount/month (₹)", type:"number", placeholder:"0 if lumpsum" },
    { key:"sipDate", label:"SIP Date (day of month)", type:"number", placeholder:"e.g. 5, 10" },
    { key:"startDate", label:"Investment Start Date", type:"date" },
    { key:"folioNo", label:"Folio Number", type:"text" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  FD: [
    { key:"bankName", label:"Bank / NBFC Name", type:"text", required:true, placeholder:"e.g. SBI, HDFC Bank" },
    { key:"principalAmount", label:"Principal Amount (₹)", type:"number", required:true },
    { key:"interestRate", label:"Interest Rate (% p.a.)", type:"number", required:true },
    { key:"compounding", label:"Compounding Frequency", type:"select", options:["Monthly","Quarterly","Half-Yearly","Yearly","Simple Interest"], required:true },
    { key:"tenureMonths", label:"Tenure (Months)", type:"number", required:true },
    { key:"startDate", label:"Start Date", type:"date", required:true },
    { key:"maturityDate", label:"Maturity Date", type:"date" },
    { key:"fdType", label:"FD Type", type:"select", options:["Regular","Tax-Saver (5yr)","Senior Citizen","Corporate FD"] },
    { key:"fdNumber", label:"FD Account / Certificate No.", type:"text" },
    { key:"autoRenew", label:"Auto Renewal", type:"select", options:["Yes","No"] },
    { key:"nomineeName", label:"Nominee", type:"text" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  ULIP: [
    { key:"planName", label:"Plan Name", type:"text", required:true, placeholder:"e.g. HDFC Life Click 2 Wealth" },
    { key:"insurer", label:"Insurance Company", type:"text", required:true },
    { key:"policyNo", label:"Policy Number", type:"text", required:true },
    { key:"premiumType", label:"Premium Frequency", type:"select", options:["Monthly","Quarterly","Half-Yearly","Yearly","Single Pay"], required:true },
    { key:"premiumAmount", label:"Premium Amount (₹)", type:"number", required:true },
    { key:"paymentDate", label:"Next Payment Date", type:"date" },
    { key:"payingTerm", label:"Premium Paying Term (Years)", type:"number", required:true },
    { key:"policyTerm", label:"Policy Term (Years)", type:"number", required:true },
    { key:"startDate", label:"Policy Start Date", type:"date", required:true },
    { key:"sumAssured", label:"Sum Assured (₹)", type:"number", required:true },
    { key:"currentFundValue", label:"Current Fund Value (₹)", type:"number" },
    { key:"totalPremiumPaid", label:"Total Premium Paid So Far (₹)", type:"number" },
    { key:"fundAllocation", label:"Fund Allocation", type:"text", placeholder:"e.g. 60% Equity, 40% Debt" },
    { key:"promisedReturn", label:"Expected Return Rate (% p.a.)", type:"number", placeholder:"e.g. 8, 10, 12" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  EPF: [
    { key:"employerName", label:"Employer / Company", type:"text", required:true },
    { key:"uan", label:"UAN (Universal Account Number)", type:"text" },
    { key:"employeeContribution", label:"Employee Contribution/month (₹)", type:"number", required:true },
    { key:"employerContribution", label:"Employer Contribution/month (₹)", type:"number", required:true },
    { key:"currentBalance", label:"Current EPF Balance (₹)", type:"number", required:true },
    { key:"interestRate", label:"Current Interest Rate (% p.a.)", type:"number", placeholder:"e.g. 8.15" },
    { key:"vpfAmount", label:"VPF Contribution/month (₹)", type:"number", placeholder:"0 if none" },
    { key:"joiningDate", label:"Employment Start Date", type:"date" },
    { key:"pensionAmount", label:"EPS Pension Amount (₹)", type:"number", placeholder:"Optional" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  PPF: [
    { key:"bankName", label:"Bank / Post Office", type:"text", required:true, placeholder:"e.g. SBI, India Post" },
    { key:"accountNo", label:"PPF Account Number", type:"text" },
    { key:"openingDate", label:"Account Opening Date", type:"date", required:true },
    { key:"yearlyDeposit", label:"Yearly Deposit (₹)", type:"number", required:true },
    { key:"currentBalance", label:"Current Balance (₹)", type:"number", required:true },
    { key:"interestRate", label:"Current Interest Rate (% p.a.)", type:"number", placeholder:"e.g. 7.1" },
    { key:"maturityDate", label:"Maturity Date (15 yr)", type:"date" },
    { key:"extensionBlock", label:"Extended (5-yr blocks)", type:"number", placeholder:"0,1,2..." },
    { key:"nominee", label:"Nominee", type:"text" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  Others: [
    { key:"assetName", label:"Asset Name", type:"text", required:true, placeholder:"e.g. Gold ETF, NPS, Bonds" },
    { key:"assetType", label:"Asset Type", type:"select", options:["Gold / Silver","NPS","Bonds / Debentures","Real Estate","Crypto","Startups / Angel","Savings Account","Other"] },
    { key:"investedAmount", label:"Invested / Purchase Value (₹)", type:"number", required:true },
    { key:"currentValue", label:"Current Value (₹)", type:"number", required:true },
    { key:"quantity", label:"Quantity / Units", type:"number" },
    { key:"purchaseDate", label:"Purchase Date", type:"date" },
    { key:"maturityDate", label:"Maturity / Expected Date", type:"date" },
    { key:"platform", label:"Platform / Custodian", type:"text", placeholder:"e.g. NPS Trust, Exchange" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
};

const TABS = ["Equity","Mutual Funds","FD","ULIP","EPF","PPF","Others"];

const TAB_COLORS = {
  "Equity":"#22d3a5","Mutual Funds":"#3b82f6","FD":"#f59e0b",
  "ULIP":"#a78bfa","EPF":"#f87171","PPF":"#34d399","Others":"#94a3b8"
};

// ─── Computed fields ──────────────────────────────────────────────────────────
function computeInvestment(item, cat) {
  switch(cat) {
    case "Equity": {
      const inv = (item.quantity||0)*(item.avgBuyPrice||0);
      const cur = (item.quantity||0)*(item.currentPrice||0);
      const gain = cur - inv;
      const pct = inv > 0 ? (gain/inv)*100 : 0;
      return { invested: inv, current: cur, gain, pct };
    }
    case "Mutual Funds": {
      const inv = Number(item.investedAmount)||0;
      const cur = (item.units||0)*(item.nav||0);
      const gain = cur - inv;
      const pct = inv > 0 ? (gain/inv)*100 : 0;
      return { invested: inv, current: cur, gain, pct };
    }
    case "FD": {
      const p = Number(item.principalAmount)||0;
      const r = Number(item.interestRate)||0;
      const t = Number(item.tenureMonths)||0;
      let maturity = p;
      if(item.compounding === "Simple Interest"){
        maturity = p * (1 + (r/100)*(t/12));
      } else {
        const n = item.compounding==="Monthly"?12:item.compounding==="Quarterly"?4:item.compounding==="Half-Yearly"?2:1;
        maturity = p * Math.pow(1 + (r/100)/n, n*(t/12));
      }
      return { invested: p, current: maturity, gain: maturity-p, pct: p>0?((maturity-p)/p)*100:0 };
    }
    case "ULIP": {
      const inv = Number(item.totalPremiumPaid)||0;
      const cur = Number(item.currentFundValue)||0;
      const gain = cur - inv;
      const pct = inv > 0 ? (gain/inv)*100 : 0;
      // Maturity projection
      let maturityVal = null;
      if(item.promisedReturn && item.policyTerm && item.premiumAmount && item.premiumType) {
        const r = Number(item.promisedReturn)/100;
        const yrs = Number(item.policyTerm);
        const payYrs = Number(item.payingTerm)||yrs;
        const freq = item.premiumType==="Monthly"?12:item.premiumType==="Quarterly"?4:item.premiumType==="Half-Yearly"?2:1;
        const annualPrem = Number(item.premiumAmount)*(item.premiumType==="Single Pay"?1:freq);
        // Future value of annuity
        maturityVal = annualPrem * ((Math.pow(1+r, payYrs)-1)/r) * Math.pow(1+r, yrs-payYrs);
      }
      return { invested: inv, current: cur, gain, pct, maturityVal };
    }
    case "EPF": {
      const bal = Number(item.currentBalance)||0;
      return { invested: bal, current: bal, gain: 0, pct: 0 };
    }
    case "PPF": {
      const bal = Number(item.currentBalance)||0;
      return { invested: bal, current: bal, gain: 0, pct: 0 };
    }
    default: {
      const inv = Number(item.investedAmount)||0;
      const cur = Number(item.currentValue)||inv;
      const gain = cur - inv;
      const pct = inv > 0 ? (gain/inv)*100 : 0;
      return { invested: inv, current: cur, gain, pct };
    }
  }
}

// ─── Table columns per category ───────────────────────────────────────────────
const TABLE_COLS = {
  Equity: ["Stock","Ticker","Qty","Avg Price","Curr Price","Invested","Curr Value","P&L","Actions"],
  "Mutual Funds": ["Fund","Category","Units","Avg NAV","Curr NAV","Invested","Curr Value","Returns","Actions"],
  FD: ["Bank","Principal","Rate","Tenure","Start Date","Maturity Value","Actions"],
  ULIP: ["Plan","Insurer","Premium","Frequency","Policy Term","Total Paid","Fund Value","Projected Maturity","Actions"],
  EPF: ["Employer","UAN","Emp Contrib/mo","Employer Contrib/mo","Balance","Interest Rate","Actions"],
  PPF: ["Bank","Account No","Yearly Deposit","Balance","Interest Rate","Maturity Date","Actions"],
  Others: ["Asset","Type","Invested","Current Value","Returns","Actions"],
};

const fmt = (n) => n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", {maximumFractionDigits:0});
const fmtPct = (n) => n == null ? "—" : (n>=0?"+":"")+Number(n).toFixed(2)+"%";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Investments() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Equity");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const nav = useNavigate();

  useEffect(() => onAuthStateChanged(auth, u => { if(!u) nav("/"); else setUser(u); }), []);

  useEffect(() => {
    if(!user) return;
    setLoading(true);
    const q = query(collection(db,"investments"), where("uid","==",user.uid), where("category","==",activeTab));
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({id:d.id,...d.data()})));
      setLoading(false);
    });
  }, [user, activeTab]);

  const openAdd = () => { setEditItem(null); setForm({}); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({...item}); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm({}); };

  const handleSave = async () => {
    if(!user) return;
    setSaving(true);
    try {
      const data = { ...form, category: activeTab, uid: user.uid };
      if(editItem) {
        await updateDoc(doc(db,"investments",editItem.id), {...data, updatedAt:serverTimestamp()});
      } else {
        await addDoc(collection(db,"investments"), {...data, createdAt:serverTimestamp()});
      }
      closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db,"investments",id));
    setDeleteConfirm(null);
  };

  // Summary
  const totals = items.reduce((acc, item) => {
    const c = computeInvestment(item, activeTab);
    acc.invested += c.invested||0;
    acc.current += c.current||0;
    return acc;
  }, { invested:0, current:0 });
  const totalGain = totals.current - totals.invested;
  const totalPct = totals.invested > 0 ? (totalGain/totals.invested)*100 : 0;

  const fields = CATEGORY_FIELDS[activeTab] || [];

  return (
    <>
      <style>{G}</style>
      <div className="inv-page">
        {/* Header */}
        <div className="inv-header">
          <div>
            <h1 className="inv-title">My <span>Investments</span></h1>
            <p className="inv-subtitle">Track, manage and grow your portfolio across all asset classes</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add {activeTab}
          </button>
        </div>

        {/* Summary Row */}
        <div className="summary-row">
          <div className="scard">
            <div className="scard-label">Total Invested</div>
            <div className="scard-value">{fmt(totals.invested)}</div>
            <div className="scard-sub">{items.length} holding{items.length!==1?"s":""}</div>
          </div>
          <div className="scard">
            <div className="scard-label">Current Value</div>
            <div className="scard-value">{fmt(totals.current)}</div>
          </div>
          <div className="scard">
            <div className="scard-label">Total P&L</div>
            <div className={`scard-value ${totalGain>=0?"pos":"neg"}`}>{fmt(totalGain)}</div>
            <div className={`scard-sub ${totalGain>=0?"pos":"neg"}`}>{fmtPct(totalPct)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab ${activeTab===t?"active":""}`}
              style={activeTab===t?{color:TAB_COLORS[t]}:{}} onClick={()=>setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <TableHeader cat={activeTab} />
          {loading ? (
            <div className="table-empty"><div className="table-empty-icon">⟳</div><div>Loading...</div></div>
          ) : items.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon">📊</div>
              <div style={{fontWeight:600,marginBottom:6}}>No {activeTab} added yet</div>
              <div style={{color:"var(--muted)",fontSize:13}}>Click "Add {activeTab}" to get started</div>
            </div>
          ) : items.map(item => (
            <TableRow key={item.id} item={item} cat={activeTab}
              onEdit={()=>openEdit(item)} onDelete={()=>setDeleteConfirm(item.id)} />
          ))}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="overlay" onClick={(e)=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            <div className="modal-head">
              <h2 className="modal-title" style={{color:TAB_COLORS[activeTab]}}>
                {editItem ? "Edit" : "Add"} {activeTab}
              </h2>
              <button className="close-btn" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                {fields.map(f => (
                  <div key={f.key} className={`form-group ${f.full?"full":""}`}>
                    <label>{f.label}{f.required?" *":""}</label>
                    {f.type==="select" ? (
                      <select value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>
                        <option value="">Select...</option>
                        {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type==="textarea" ? (
                      <textarea rows={2} placeholder={f.placeholder||""} value={form[f.key]||""}
                        onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                    ) : (
                      <input type={f.type} placeholder={f.placeholder||""} value={form[f.key]||""}
                        onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                    )}
                  </div>
                ))}
              </div>
              {/* ULIP Maturity Calculator */}
              {activeTab==="ULIP" && form.promisedReturn && form.policyTerm && form.premiumAmount && (
                <ULIPCalculator form={form} />
              )}
              {/* FD Calculator */}
              {activeTab==="FD" && form.principalAmount && form.interestRate && form.tenureMonths && (
                <FDCalculator form={form} />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editItem ? "Update" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="overlay">
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-head">
              <h2 className="modal-title" style={{color:"var(--red)"}}>Delete Entry</h2>
            </div>
            <div className="modal-body">
              <p style={{color:"var(--muted2)"}}>Are you sure you want to delete this entry? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Table Header ─────────────────────────────────────────────────────────────
function TableHeader({ cat }) {
  const cols = TABLE_COLS[cat] || [];
  const count = cols.length;
  return (
    <div className="table-head" style={{gridTemplateColumns:`repeat(${count-1},1fr) 100px`}}>
      {cols.map(c => <span key={c}>{c}</span>)}
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function TableRow({ item, cat, onEdit, onDelete }) {
  const c = computeInvestment(item, cat);
  const cols = TABLE_COLS[cat] || [];
  const count = cols.length;

  const cells = () => {
    switch(cat) {
      case "Equity": return [
        item.stockName, item.ticker||"—",
        item.quantity, fmt(item.avgBuyPrice), fmt(item.currentPrice),
        fmt(c.invested), fmt(c.current),
        <span className={c.gain>=0?"pos":"neg"}>{fmt(c.gain)}<br/><small>{fmtPct(c.pct)}</small></span>
      ];
      case "Mutual Funds": return [
        <span style={{fontWeight:600}}>{item.fundName}</span>,
        <span className="tag" style={{background:"rgba(59,130,246,0.1)",color:"#3b82f6"}}>{item.category}</span>,
        item.units, fmt(item.avgNav), fmt(item.nav),
        fmt(c.invested), fmt(c.current),
        <span className={c.gain>=0?"pos":"neg"}>{fmtPct(c.pct)}</span>
      ];
      case "FD": return [
        item.bankName, fmt(item.principalAmount),
        item.interestRate+"%", item.tenureMonths+" mo",
        item.startDate||"—", <span className="pos">{fmt(c.current)}</span>
      ];
      case "ULIP": return [
        item.planName, item.insurer,
        fmt(item.premiumAmount), item.premiumType,
        item.policyTerm+" yr", fmt(item.totalPremiumPaid),
        fmt(item.currentFundValue),
        c.maturityVal ? <span className="pos">{fmt(c.maturityVal)}</span> : "—"
      ];
      case "EPF": return [
        item.employerName, item.uan||"—",
        fmt(item.employeeContribution), fmt(item.employerContribution),
        <span className="pos">{fmt(item.currentBalance)}</span>,
        (item.interestRate||"—")+"%"
      ];
      case "PPF": return [
        item.bankName, item.accountNo||"—",
        fmt(item.yearlyDeposit),
        <span className="pos">{fmt(item.currentBalance)}</span>,
        (item.interestRate||"—")+"%",
        item.maturityDate||"—"
      ];
      default: return [
        item.assetName,
        <span className="tag" style={{background:"rgba(148,163,184,0.1)",color:"#94a3b8"}}>{item.assetType}</span>,
        fmt(item.investedAmount), fmt(item.currentValue),
        <span className={c.gain>=0?"pos":"neg"}>{fmtPct(c.pct)}</span>
      ];
    }
  };

  return (
    <div className="table-row" style={{gridTemplateColumns:`repeat(${count-1},1fr) 100px`,fontSize:13}}>
      {cells().map((cell,i) => <div key={i}>{cell}</div>)}
      <div style={{display:"flex",gap:6}}>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Del</button>
      </div>
    </div>
  );
}

// ─── ULIP Maturity Calculator ─────────────────────────────────────────────────
function ULIPCalculator({ form }) {
  const r = Number(form.promisedReturn)/100;
  const yrs = Number(form.policyTerm);
  const payYrs = Number(form.payingTerm)||yrs;
  const freq = form.premiumType==="Monthly"?12:form.premiumType==="Quarterly"?4:form.premiumType==="Half-Yearly"?2:1;
  const annual = Number(form.premiumAmount)*(form.premiumType==="Single Pay"?1:freq);
  const totalPaid = annual * payYrs;
  const maturity = r>0 ? annual * ((Math.pow(1+r,payYrs)-1)/r) * Math.pow(1+r,yrs-payYrs) : totalPaid;
  const gain = maturity - totalPaid;

  return (
    <div className="calc-box">
      <div className="calc-title">📈 Projected Maturity (at {form.promisedReturn}% p.a.)</div>
      <div className="calc-row"><span>Annual Premium</span><span>{fmt(annual)}</span></div>
      <div className="calc-row"><span>Total Premium Over {payYrs} yrs</span><span>{fmt(totalPaid)}</span></div>
      <div className="calc-row"><span>Policy Term</span><span>{yrs} years</span></div>
      <div className="calc-row"><span>Estimated Gain</span><span className="pos">{fmt(gain)}</span></div>
      <div className="calc-row calc-total"><span>Expected Maturity Value</span><span>{fmt(maturity)}</span></div>
    </div>
  );
}

// ─── FD Calculator ────────────────────────────────────────────────────────────
function FDCalculator({ form }) {
  const p = Number(form.principalAmount)||0;
  const r = Number(form.interestRate)||0;
  const t = Number(form.tenureMonths)||0;
  let maturity = p;
  if(form.compounding === "Simple Interest") {
    maturity = p * (1 + (r/100)*(t/12));
  } else {
    const n = form.compounding==="Monthly"?12:form.compounding==="Quarterly"?4:form.compounding==="Half-Yearly"?2:1;
    maturity = p * Math.pow(1 + (r/100)/(n||1), (n||1)*(t/12));
  }
  const interest = maturity - p;

  return (
    <div className="calc-box">
      <div className="calc-title">🏦 FD Maturity Calculator</div>
      <div className="calc-row"><span>Principal</span><span>{fmt(p)}</span></div>
      <div className="calc-row"><span>Interest Earned</span><span className="pos">{fmt(interest)}</span></div>
      <div className="calc-row"><span>Effective Rate</span><span>{p>0?((interest/p)*100).toFixed(2):0}%</span></div>
      <div className="calc-row calc-total"><span>Maturity Value</span><span>{fmt(maturity)}</span></div>
    </div>
  );
}
