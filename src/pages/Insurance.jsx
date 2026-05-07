import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const G = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090f;--surface:#0f1420;--card:#141927;--border:rgba(255,255,255,0.07);
  --accent:#22d3a5;--blue:#3b82f6;--amber:#f59e0b;--purple:#a78bfa;
  --red:#f87171;--green:#34d399;--text:#f1f5f9;--muted:#64748b;--muted2:#94a3b8;
  --font-head:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font-body)}
.ins-page{max-width:1200px;margin:0 auto;padding:32px 24px}
.ins-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;gap:16px;flex-wrap:wrap}
.ins-title{font-family:var(--font-head);font-size:28px;font-weight:800;letter-spacing:-0.5px}
.ins-title span{color:var(--accent)}
.ins-subtitle{color:var(--muted2);font-size:14px;margin-top:4px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;font-family:var(--font-body);font-size:14px;font-weight:500;cursor:pointer;transition:all .2s}
.btn-primary{background:var(--accent);color:#07090f}
.btn-primary:hover{background:#1fbd95;transform:translateY(-1px)}
.btn-ghost{background:rgba(255,255,255,0.05);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{background:rgba(255,255,255,0.1)}
.btn-danger{background:rgba(248,113,113,0.1);color:var(--red);border:1px solid rgba(248,113,113,0.2)}
.btn-danger:hover{background:rgba(248,113,113,0.2)}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:7px}

/* Summary row */
.summary-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:36px}
.scard{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
.scard-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px}
.scard-value{font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--text)}
.scard-sub{font-size:12px;color:var(--muted2);margin-top:4px}

/* Section */
.ins-section{margin-bottom:40px}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.section-title{font-family:var(--font-head);font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px}
.section-badge{font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px}

/* Cards grid */
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.ins-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;position:relative;transition:border-color .2s,transform .2s}
.ins-card:hover{border-color:rgba(255,255,255,0.15);transform:translateY(-2px)}
.ins-card.expiring{border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.04)}
.ins-card.expired{border-color:rgba(248,113,113,0.4);background:rgba(248,113,113,0.04)}
.card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
.card-provider{font-family:var(--font-head);font-size:15px;font-weight:700}
.card-plan{font-size:12px;color:var(--muted2);margin-top:2px}
.status-badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:5px}
.status-active{background:rgba(52,211,153,0.1);color:var(--green)}
.status-expiring{background:rgba(245,158,11,0.1);color:var(--amber)}
.status-expired{background:rgba(248,113,113,0.1);color:var(--red)}
.card-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px}
.card-field label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);display:block;margin-bottom:2px}
.card-field span{font-size:13px;font-weight:500}
.card-cover{font-size:20px;font-weight:800;font-family:var(--font-head);color:var(--green)}
.card-actions{display:flex;gap:8px;border-top:1px solid var(--border);padding-top:14px}
.empty-state{background:var(--card);border:1px dashed var(--border);border-radius:16px;padding:40px;text-align:center;color:var(--muted)}
.empty-icon{font-size:36px;margin-bottom:10px}

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
.close-btn{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;border-radius:6px;display:flex}
.close-btn:hover{color:var(--text);background:rgba(255,255,255,0.05)}
@media(max-width:600px){.ins-page{padding:20px 16px}.form-row{grid-template-columns:1fr}}
`;

const INSURANCE_TYPES = [
  { key:"Term", label:"Term Insurance", color:"#3b82f6", icon:"🛡️" },
  { key:"Life", label:"Life Insurance", color:"#a78bfa", icon:"❤️" },
  { key:"Health", label:"Health Insurance", color:"#22d3a5", icon:"🏥" },
];

const FIELDS = {
  Term: [
    { key:"provider", label:"Insurance Company", type:"text", required:true, placeholder:"e.g. LIC, HDFC Life, ICICI Prudential" },
    { key:"planName", label:"Plan Name", type:"text", required:true, placeholder:"e.g. LIC Tech Term" },
    { key:"policyNo", label:"Policy Number", type:"text", required:true },
    { key:"sumAssured", label:"Sum Assured / Cover (₹)", type:"number", required:true },
    { key:"premiumAmount", label:"Premium Amount (₹)", type:"number", required:true },
    { key:"premiumFreq", label:"Premium Frequency", type:"select", options:["Monthly","Quarterly","Half-Yearly","Yearly","Single Pay"], required:true },
    { key:"policyTerm", label:"Policy Term (Years)", type:"number", required:true },
    { key:"premiumPayingTerm", label:"Premium Paying Term (Yrs)", type:"number" },
    { key:"startDate", label:"Policy Start Date", type:"date", required:true },
    { key:"renewalDate", label:"Next Renewal / Payment Date", type:"date", required:true },
    { key:"maturityDate", label:"Policy End Date", type:"date" },
    { key:"deathBenefit", label:"Death Benefit Type", type:"select", options:["Lump Sum","Monthly Income","Lump Sum + Income"] },
    { key:"riders", label:"Riders Attached", type:"text", placeholder:"e.g. Critical Illness, Accidental Death" },
    { key:"nomineeName", label:"Nominee Name", type:"text" },
    { key:"nomineeRelation", label:"Nominee Relation", type:"text", placeholder:"e.g. Spouse, Child" },
    { key:"claimSettlementRatio", label:"Claim Settlement Ratio (%)", type:"number", placeholder:"e.g. 98.5" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  Life: [
    { key:"provider", label:"Insurance Company", type:"text", required:true },
    { key:"planName", label:"Plan Name", type:"text", required:true, placeholder:"e.g. LIC Jeevan Anand, Endowment Plan" },
    { key:"policyType", label:"Policy Type", type:"select", options:["Endowment","Whole Life","Money Back","Child Plan","Pension / Annuity","ULIP"], required:true },
    { key:"policyNo", label:"Policy Number", type:"text", required:true },
    { key:"sumAssured", label:"Sum Assured (₹)", type:"number", required:true },
    { key:"premiumAmount", label:"Premium Amount (₹)", type:"number", required:true },
    { key:"premiumFreq", label:"Premium Frequency", type:"select", options:["Monthly","Quarterly","Half-Yearly","Yearly"], required:true },
    { key:"policyTerm", label:"Policy Term (Years)", type:"number", required:true },
    { key:"premiumPayingTerm", label:"Premium Paying Term (Yrs)", type:"number" },
    { key:"startDate", label:"Policy Start Date", type:"date", required:true },
    { key:"renewalDate", label:"Next Renewal Date", type:"date", required:true },
    { key:"maturityDate", label:"Maturity Date", type:"date" },
    { key:"bonusAccrued", label:"Bonus / Loyalty Additions (₹)", type:"number" },
    { key:"surrenderValue", label:"Current Surrender Value (₹)", type:"number" },
    { key:"totalPremiumPaid", label:"Total Premium Paid So Far (₹)", type:"number" },
    { key:"nomineeName", label:"Nominee Name", type:"text" },
    { key:"nomineeRelation", label:"Nominee Relation", type:"text" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
  Health: [
    { key:"provider", label:"Insurance Company", type:"text", required:true, placeholder:"e.g. Star Health, Niva Bupa" },
    { key:"planName", label:"Plan Name", type:"text", required:true, placeholder:"e.g. Family Floater, Super Top-Up" },
    { key:"policyType", label:"Policy Type", type:"select", options:["Individual","Family Floater","Senior Citizen","Critical Illness","Super Top-Up","Group Health"], required:true },
    { key:"policyNo", label:"Policy Number", type:"text", required:true },
    { key:"sumInsured", label:"Sum Insured / Cover (₹)", type:"number", required:true },
    { key:"premiumAmount", label:"Premium Amount (₹)", type:"number", required:true },
    { key:"premiumFreq", label:"Premium Frequency", type:"select", options:["Monthly","Quarterly","Half-Yearly","Yearly"], required:true },
    { key:"startDate", label:"Policy Start Date", type:"date", required:true },
    { key:"renewalDate", label:"Renewal Date", type:"date", required:true },
    { key:"membersCount", label:"Members Covered", type:"number", placeholder:"e.g. 4" },
    { key:"members", label:"Members Names", type:"text", placeholder:"e.g. Self, Spouse, Child 1" },
    { key:"roomRentLimit", label:"Room Rent Limit", type:"text", placeholder:"e.g. No limit / 1% SI / ₹5000/day" },
    { key:"copay", label:"Co-Pay (%)", type:"number", placeholder:"e.g. 0, 10, 20" },
    { key:"noClaimBonus", label:"No-Claim Bonus (₹)", type:"number" },
    { key:"networkHospitals", label:"Network Hospitals (approx.)", type:"number", placeholder:"e.g. 10000" },
    { key:"preExisting", label:"Pre-existing Diseases Waiting Period", type:"text", placeholder:"e.g. 2 years, 4 years" },
    { key:"tlPeriod", label:"No Claim Bonus (% per yr)", type:"number", placeholder:"e.g. 10, 20" },
    { key:"tpaName", label:"TPA Name", type:"text", placeholder:"e.g. Medi Assist, Vidal Health" },
    { key:"notes", label:"Notes", type:"textarea", full:true },
  ],
};

const fmt = (n) => n == null || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN", {maximumFractionDigits:0});

function getRenewalStatus(renewalDate) {
  if(!renewalDate) return "active";
  const today = new Date();
  const renewal = new Date(renewalDate);
  const diff = (renewal - today) / (1000*60*60*24);
  if(diff < 0) return "expired";
  if(diff <= 30) return "expiring";
  return "active";
}

function daysUntilRenewal(renewalDate) {
  if(!renewalDate) return null;
  const diff = (new Date(renewalDate) - new Date()) / (1000*60*60*24);
  return Math.round(diff);
}

export default function Insurance() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeType, setActiveType] = useState("Term");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const nav = useNavigate();

  useEffect(() => onAuthStateChanged(auth, u => { if(!u) nav("/"); else setUser(u); }), []);
  useEffect(() => {
    if(!user) return;
    setLoading(true);
    const q = query(collection(db,"insurance"), where("uid","==",user.uid));
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({id:d.id,...d.data()})));
      setLoading(false);
    });
  }, [user]);

  const openAdd = (type) => { setActiveType(type); setEditItem(null); setForm({}); setModalOpen(true); };
  const openEdit = (item) => { setActiveType(item.type); setEditItem(item); setForm({...item}); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm({}); };

  const handleSave = async () => {
    if(!user) return;
    setSaving(true);
    try {
      const data = { ...form, type: activeType, uid: user.uid };
      if(editItem) await updateDoc(doc(db,"insurance",editItem.id), {...data, updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"insurance"), {...data, createdAt:serverTimestamp()});
      closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db,"insurance",id));
    setDeleteConfirm(null);
  };

  // Summaries
  const totalLifeCover = items.filter(i=>i.type==="Term"||i.type==="Life")
    .reduce((s,i)=>s+(Number(i.sumAssured)||0),0);
  const totalHealthCover = items.filter(i=>i.type==="Health")
    .reduce((s,i)=>s+(Number(i.sumInsured)||0),0);
  const totalPremium = items.reduce((s,i)=>{
    const freq = i.premiumFreq==="Monthly"?12:i.premiumFreq==="Quarterly"?4:i.premiumFreq==="Half-Yearly"?2:1;
    return s + (Number(i.premiumAmount)||0)*freq;
  },0);
  const expiringSoon = items.filter(i=>getRenewalStatus(i.renewalDate)==="expiring").length;

  return (
    <>
      <style>{G}</style>
      <div className="ins-page">
        <div className="ins-header">
          <div>
            <h1 className="ins-title">My <span>Insurance</span></h1>
            <p className="ins-subtitle">All your protection covers in one place</p>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-row">
          <div className="scard">
            <div className="scard-label">Total Life Cover</div>
            <div className="scard-value">{fmt(totalLifeCover)}</div>
            <div className="scard-sub">{items.filter(i=>i.type==="Term"||i.type==="Life").length} policies</div>
          </div>
          <div className="scard">
            <div className="scard-label">Total Health Cover</div>
            <div className="scard-value">{fmt(totalHealthCover)}</div>
            <div className="scard-sub">{items.filter(i=>i.type==="Health").length} policies</div>
          </div>
          <div className="scard">
            <div className="scard-label">Total Annual Premium</div>
            <div className="scard-value">{fmt(totalPremium)}</div>
          </div>
          <div className="scard">
            <div className="scard-label">Expiring Soon</div>
            <div className="scard-value" style={{color: expiringSoon>0?"var(--amber)":"var(--green)"}}>
              {expiringSoon} policies
            </div>
            <div className="scard-sub">within 30 days</div>
          </div>
        </div>

        {/* Sections */}
        {INSURANCE_TYPES.map(t => {
          const typeItems = items.filter(i=>i.type===t.key);
          return (
            <div className="ins-section" key={t.key}>
              <div className="section-header">
                <div className="section-title">
                  <span>{t.icon}</span>
                  <span style={{color:t.color}}>{t.label}</span>
                  <span className="section-badge" style={{background:`${t.color}18`,color:t.color}}>
                    {typeItems.length} {typeItems.length===1?"policy":"policies"}
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={()=>openAdd(t.key)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add {t.label}
                </button>
              </div>

              {loading ? (
                <div className="empty-state"><div>Loading...</div></div>
              ) : typeItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">{t.icon}</div>
                  <div style={{fontWeight:600,marginBottom:4}}>No {t.label} added</div>
                  <div style={{fontSize:13}}>Add your policies to track coverage & renewals</div>
                </div>
              ) : (
                <div className="cards-grid">
                  {typeItems.map(item => (
                    <InsuranceCard key={item.id} item={item} type={t}
                      onEdit={()=>openEdit(item)} onDelete={()=>setDeleteConfirm(item.id)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            <div className="modal-head">
              <h2 className="modal-title">
                {editItem?"Edit":"Add"} {INSURANCE_TYPES.find(t=>t.key===activeType)?.label}
              </h2>
              <button className="close-btn" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                {(FIELDS[activeType]||[]).map(f => (
                  <div key={f.key} className={`form-group ${f.full?"full":""}`}>
                    <label>{f.label}{f.required?" *":""}</label>
                    {f.type==="select" ? (
                      <select value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>
                        <option value="">Select...</option>
                        {f.options.map(o=><option key={o}>{o}</option>)}
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
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving?"Saving...":editItem?"Update":"Add Policy"}
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
              <h2 className="modal-title" style={{color:"var(--red)"}}>Delete Policy</h2>
            </div>
            <div className="modal-body">
              <p style={{color:"var(--muted2)"}}>This will permanently delete this insurance record.</p>
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

function InsuranceCard({ item, type, onEdit, onDelete }) {
  const status = getRenewalStatus(item.renewalDate);
  const days = daysUntilRenewal(item.renewalDate);
  const cover = item.sumAssured || item.sumInsured;
  const freq = item.premiumFreq==="Monthly"?12:item.premiumFreq==="Quarterly"?4:item.premiumFreq==="Half-Yearly"?2:1;
  const annualPrem = (Number(item.premiumAmount)||0)*freq;

  return (
    <div className={`ins-card ${status==="expiring"?"expiring":status==="expired"?"expired":""}`}>
      <div className="card-top">
        <div>
          <div className="card-provider">{item.provider}</div>
          <div className="card-plan">{item.planName} {item.policyType?`· ${item.policyType}`:""}</div>
        </div>
        <span className={`status-badge status-${status}`}>
          {status==="active"?"Active":status==="expiring"?`${days}d left`:"Expired"}
        </span>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",color:"var(--muted)",marginBottom:4}}>
          {type.key==="Health"?"Sum Insured":"Sum Assured"}
        </div>
        <div className="card-cover">{fmt(cover)}</div>
      </div>

      <div className="card-grid">
        <div className="card-field">
          <label>Policy No.</label>
          <span style={{fontSize:12}}>{item.policyNo||"—"}</span>
        </div>
        <div className="card-field">
          <label>Annual Premium</label>
          <span>{fmt(annualPrem)}</span>
        </div>
        <div className="card-field">
          <label>Start Date</label>
          <span>{item.startDate||"—"}</span>
        </div>
        <div className="card-field">
          <label>Renewal Date</label>
          <span style={{color:status==="expiring"?"var(--amber)":status==="expired"?"var(--red)":"inherit"}}>
            {item.renewalDate||"—"}
          </span>
        </div>
        {(type.key==="Term"||type.key==="Life") && item.nomineeName && (
          <div className="card-field full" style={{gridColumn:"1/-1"}}>
            <label>Nominee</label>
            <span>{item.nomineeName} {item.nomineeRelation?`(${item.nomineeRelation})`:""}</span>
          </div>
        )}
        {type.key==="Health" && item.members && (
          <div className="card-field" style={{gridColumn:"1/-1"}}>
            <label>Members</label>
            <span style={{fontSize:12}}>{item.members}</span>
          </div>
        )}
        {type.key==="Term" && item.claimSettlementRatio && (
          <div className="card-field">
            <label>CSR</label>
            <span style={{color:"var(--green)"}}>{item.claimSettlementRatio}%</span>
          </div>
        )}
        {type.key==="Life" && item.surrenderValue && (
          <div className="card-field">
            <label>Surrender Value</label>
            <span>{fmt(item.surrenderValue)}</span>
          </div>
        )}
        {type.key==="Health" && item.noClaimBonus && (
          <div className="card-field">
            <label>NCB</label>
            <span style={{color:"var(--green)"}}>{fmt(item.noClaimBonus)}</span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button className="btn btn-ghost btn-sm" onClick={onEdit} style={{flex:1}}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
