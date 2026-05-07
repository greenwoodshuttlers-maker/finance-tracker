import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  collection, onSnapshot, query, where
} from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
.dash-page{max-width:1280px;margin:0 auto;padding:32px 24px}
.dash-header{margin-bottom:32px}
.dash-greeting{font-size:14px;color:var(--muted2);margin-bottom:4px}
.dash-title{font-family:var(--font-head);font-size:32px;font-weight:800;letter-spacing:-.5px}
.dash-title span{color:var(--accent)}
.dash-date{font-size:13px;color:var(--muted);margin-top:4px}

/* Net worth banner */
.nw-banner{background:linear-gradient(135deg,#0d1f2d 0%,#0f2318 100%);border:1px solid rgba(34,211,165,0.2);border-radius:20px;padding:28px 32px;margin-bottom:28px;position:relative;overflow:hidden}
.nw-banner::before{content:'';position:absolute;top:-40px;right:-40px;width:180px;height:180px;background:radial-gradient(circle,rgba(34,211,165,0.12) 0%,transparent 70%);border-radius:50%}
.nw-row{display:flex;align-items:center;gap:40px;flex-wrap:wrap}
.nw-main-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:rgba(34,211,165,.7);margin-bottom:6px}
.nw-main-value{font-family:var(--font-head);font-size:40px;font-weight:800;color:var(--accent);letter-spacing:-1px}
.nw-divider{width:1px;height:60px;background:var(--border)}
.nw-stat-label{font-size:11px;color:var(--muted2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.nw-stat-value{font-family:var(--font-head);font-size:20px;font-weight:700}

/* Grid layouts */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:20px}
.grid-1-2{display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-bottom:20px}
.grid-2-1{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px}

/* Cards */
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px}
.card-title{font-family:var(--font-head);font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
.card-title a{font-size:12px;color:var(--accent);text-decoration:none;font-family:var(--font-body);text-transform:none;letter-spacing:0}
.card-title a:hover{opacity:.8}

/* Stat item */
.stat-list{display:flex;flex-direction:column;gap:10px}
.stat-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px}
.stat-item-left{display:flex;align-items:center;gap:10px}
.stat-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.stat-name{font-size:13px;font-weight:500}
.stat-sub{font-size:11px;color:var(--muted)}
.stat-right{text-align:right}
.stat-value{font-size:14px;font-weight:600;font-family:var(--font-head)}
.stat-pct{font-size:11px;margin-top:1px}
.pos{color:var(--green)}.neg{color:var(--red)}

/* Insurance items */
.ins-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)}
.ins-row:last-child{border-bottom:none}
.ins-row-left{display:flex;align-items:center;gap:10px}
.ins-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
.ins-name{font-size:13px;font-weight:600}
.ins-plan{font-size:11px;color:var(--muted2)}
.ins-cover{font-family:var(--font-head);font-size:14px;font-weight:700}
.status-dot{width:8px;height:8px;border-radius:50%}

/* Expense bars */
.exp-bar-row{display:flex;flex-direction:column;gap:12px}
.exp-bar-item{display:flex;align-items:center;gap:12px}
.exp-bar-label{font-size:12px;width:90px;flex-shrink:0;color:var(--muted2)}
.exp-bar-track{flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden}
.exp-bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
.exp-bar-val{font-size:12px;font-weight:600;width:80px;text-align:right;flex-shrink:0}

/* Allocation donut labels */
.legend{display:flex;flex-direction:column;gap:8px;justify-content:center}
.legend-item{display:flex;align-items:center;gap:8px;font-size:12px}
.legend-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}

/* Alert */
.alert{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px}
.alert-warn{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:var(--amber)}

@media(max-width:900px){.grid-2,.grid-1-2,.grid-2-1{grid-template-columns:1fr}.grid-3{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.grid-3{grid-template-columns:1fr}.dash-page{padding:20px 16px}.nw-main-value{font-size:30px}.nw-divider{display:none}}
`;

const INV_COLORS = {
  Equity:"#22d3a5","Mutual Funds":"#3b82f6",FD:"#f59e0b",ULIP:"#a78bfa",EPF:"#f87171",PPF:"#34d399",Others:"#94a3b8"
};

function computeCurrentValue(item) {
  switch(item.category) {
    case "Equity": return (item.quantity||0)*(item.currentPrice||0);
    case "Mutual Funds": return (item.units||0)*(item.nav||0);
    case "FD": {
      const p=Number(item.principalAmount)||0, r=Number(item.interestRate)||0, t=Number(item.tenureMonths)||0;
      if(!p||!r||!t) return p;
      if(item.compounding==="Simple Interest") return p*(1+(r/100)*(t/12));
      const n=item.compounding==="Monthly"?12:item.compounding==="Quarterly"?4:item.compounding==="Half-Yearly"?2:1;
      return p*Math.pow(1+(r/100)/n,n*(t/12));
    }
    case "ULIP": return Number(item.currentFundValue)||Number(item.totalPremiumPaid)||0;
    case "EPF": return Number(item.currentBalance)||0;
    case "PPF": return Number(item.currentBalance)||0;
    default: return Number(item.currentValue)||Number(item.investedAmount)||0;
  }
}

function computeInvested(item) {
  switch(item.category) {
    case "Equity": return (item.quantity||0)*(item.avgBuyPrice||0);
    case "Mutual Funds": return Number(item.investedAmount)||0;
    case "FD": return Number(item.principalAmount)||0;
    case "ULIP": return Number(item.totalPremiumPaid)||0;
    case "EPF": return Number(item.currentBalance)||0;
    case "PPF": return Number(item.currentBalance)||0;
    default: return Number(item.investedAmount)||0;
  }
}

const fmt = (n, short=false) => {
  if(n==null) return "—";
  if(short) {
    if(n>=10000000) return "₹"+(n/10000000).toFixed(2)+"Cr";
    if(n>=100000) return "₹"+(n/100000).toFixed(2)+"L";
    if(n>=1000) return "₹"+(n/1000).toFixed(1)+"K";
  }
  return "₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});
};
const fmtPct = n => (n>=0?"+":"")+Number(n).toFixed(2)+"%";

function getRenewalStatus(d) {
  if(!d) return "active";
  const diff=(new Date(d)-new Date())/(1000*60*60*24);
  if(diff<0) return "expired";
  if(diff<=30) return "expiring";
  return "active";
}



export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => onAuthStateChanged(auth, u => { if(!u) nav("/"); else setUser(u); }), []);

  useEffect(() => {
    if(!user) return;
    let done = 0;
    const check = () => { done++; if(done===3) setLoading(false); };
    const u1 = onSnapshot(query(collection(db,"investments"), where("uid","==",user.uid)),
      s => { setInvestments(s.docs.map(d=>({id:d.id,...d.data()}))); check(); });
    const u2 = onSnapshot(query(collection(db,"insurance"), where("uid","==",user.uid)),
      s => { setInsurance(s.docs.map(d=>({id:d.id,...d.data()}))); check(); });
    const u3 = onSnapshot(query(collection(db,"transactions"), where("uid","==",user.uid)),
      s => { setTransactions(s.docs.map(d=>({id:d.id,...d.data()}))); check(); });
    return () => { u1(); u2(); u3(); };
  }, [user]);

  // ── Derived values ────────────────────────────────────────────────────────
  const totalInvested = investments.reduce((s,i)=>s+computeInvested(i),0);
  const totalCurrentValue = investments.reduce((s,i)=>s+computeCurrentValue(i),0);
  const totalGain = totalCurrentValue - totalInvested;
  const totalGainPct = totalInvested>0?(totalGain/totalInvested)*100:0;

  // By category
  const byCat = investments.reduce((acc,i) => {
    const cat = i.category||"Others";
    if(!acc[cat]) acc[cat]={invested:0,current:0};
    acc[cat].invested += computeInvested(i);
    acc[cat].current += computeCurrentValue(i);
    return acc;
  },{});
  const catData = Object.entries(byCat).map(([name,v])=>({name,value:v.current,invested:v.invested}))
    .sort((a,b)=>b.value-a.value);

  // Insurance
  const totalLifeCover = insurance.filter(i=>i.type==="Term"||i.type==="Life")
    .reduce((s,i)=>s+(Number(i.sumAssured)||0),0);
  const totalHealthCover = insurance.filter(i=>i.type==="Health")
    .reduce((s,i)=>s+(Number(i.sumInsured)||0),0);
  const annualInsurancePremium = insurance.reduce((s,i)=>{
    const freq=i.premiumFreq==="Monthly"?12:i.premiumFreq==="Quarterly"?4:i.premiumFreq==="Half-Yearly"?2:1;
    return s+(Number(i.premiumAmount)||0)*freq;
  },0);
  const expiringSoon = insurance.filter(i=>getRenewalStatus(i.renewalDate)==="expiring");

  // Expenses (last 6 months by category)
  const expensesByCat = transactions
    .filter(t=>t.type==="expense"||t.amount<0)
    .reduce((acc,t)=>{
      const cat=t.category||"Other";
      acc[cat]=(acc[cat]||0)+Math.abs(Number(t.amount)||0);
      return acc;
    },{});
  const expenseData = Object.entries(expensesByCat)
    .sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([name,value])=>({name,value}));
  const totalExpenses = expenseData.reduce((s,e)=>s+e.value,0);

  // Total income
  const totalIncome = transactions
    .filter(t=>t.type==="income"||t.amount>0)
    .reduce((s,t)=>s+(Number(t.amount)||0),0);

  // Net worth = investments current value + (income - expenses)
  const savings = Math.max(0, totalIncome - totalExpenses);
  const netWorth = totalCurrentValue + savings;

  const today = new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const expMaxVal = expenseData.length>0?expenseData[0].value:1;

  if(loading) return (
    <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontFamily:"var(--font-body)"}}>
      <style>{G}</style>
      Loading your dashboard…
    </div>
  );

  return (
    <>
      <style>{G}</style>
      <div className="dash-page">
        {/* Header */}
        <div className="dash-header">
          <div className="dash-greeting">Welcome back 👋</div>
          <h1 className="dash-title">Financial <span>Overview</span></h1>
          <div className="dash-date">{today}</div>
        </div>

        {/* Renewal Alerts */}
        {expiringSoon.length>0 && (
          <div className="alert alert-warn">
            ⚠️ <strong>{expiringSoon.length} insurance {expiringSoon.length===1?"policy":"policies"}</strong> expiring within 30 days — {expiringSoon.map(i=>i.planName||i.provider).join(", ")}
          </div>
        )}

        {/* Net Worth Banner */}
        <div className="nw-banner">
          <div className="nw-row">
            <div>
              <div className="nw-main-label">Total Net Worth</div>
              <div className="nw-main-value">{fmt(netWorth)}</div>
            </div>
            <div className="nw-divider" />
            <div>
              <div className="nw-stat-label">Investments</div>
              <div className="nw-stat-value">{fmt(totalCurrentValue, true)}</div>
            </div>
            <div className="nw-divider" />
            <div>
              <div className="nw-stat-label">Unrealised P&L</div>
              <div className={`nw-stat-value ${totalGain>=0?"pos":"neg"}`}>
                {fmt(totalGain, true)} <span style={{fontSize:14}}>{fmtPct(totalGainPct)}</span>
              </div>
            </div>
            <div className="nw-divider" />
            <div>
              <div className="nw-stat-label">Total Invested</div>
              <div className="nw-stat-value">{fmt(totalInvested, true)}</div>
            </div>
            <div className="nw-divider" />
            <div>
              <div className="nw-stat-label">Life Cover</div>
              <div className="nw-stat-value">{fmt(totalLifeCover, true)}</div>
            </div>
          </div>
        </div>

        {/* Row 1: Investment Allocation + Category Breakdown */}
        <div className="grid-2-1">
          {/* Donut + legend */}
          <div className="card">
            <div className="card-title">
              Investment Allocation
              <Link to="/investments">View All →</Link>
            </div>
            <div style={{display:"flex",gap:24,alignItems:"center"}}>
              <div style={{width:180,height:180,flexShrink:0}}>
                <Doughnut
                  data={{
                    labels: catData.map(e=>e.name),
                    datasets:[{
                      data: catData.map(e=>e.value),
                      backgroundColor: catData.map(e=>INV_COLORS[e.name]||"#94a3b8"),
                      borderWidth: 0,
                      hoverOffset: 4,
                    }]
                  }}
                  options={{
                    cutout:"65%",
                    plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>" "+fmt(ctx.parsed)}}},
                    maintainAspectRatio:true,
                  }}
                />
              </div>
              <div className="legend" style={{flex:1}}>
                {catData.map((e,i)=>{
                  const pct = totalCurrentValue>0?(e.value/totalCurrentValue)*100:0;
                  const gain = e.value-e.invested;
                  return (
                    <div key={i} className="legend-item">
                      <div className="legend-dot" style={{background:INV_COLORS[e.name]||"#94a3b8"}} />
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600}}>{e.name}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{pct.toFixed(1)}% · {fmt(e.value,true)}</div>
                      </div>
                      <span className={gain>=0?"pos":"neg"} style={{fontSize:11}}>{fmtPct(e.invested>0?(gain/e.invested)*100:0)}</span>
                    </div>
                  );
                })}
                {catData.length===0 && <div style={{color:"var(--muted)",fontSize:13}}>No investments yet</div>}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card" style={{flex:1}}>
              <div className="card-title">Insurance Summary <Link to="/insurance">View →</Link></div>
              <div className="stat-list">
                <div className="stat-item">
                  <div className="stat-item-left">
                    <span style={{fontSize:18}}>🛡️</span>
                    <div><div className="stat-name">Life Cover</div><div className="stat-sub">{insurance.filter(i=>i.type==="Term"||i.type==="Life").length} policies</div></div>
                  </div>
                  <div className="stat-right"><div className="stat-value" style={{color:"var(--blue)"}}>{fmt(totalLifeCover,true)}</div></div>
                </div>
                <div className="stat-item">
                  <div className="stat-item-left">
                    <span style={{fontSize:18}}>🏥</span>
                    <div><div className="stat-name">Health Cover</div><div className="stat-sub">{insurance.filter(i=>i.type==="Health").length} policies</div></div>
                  </div>
                  <div className="stat-right"><div className="stat-value" style={{color:"var(--accent)"}}>{fmt(totalHealthCover,true)}</div></div>
                </div>
                <div className="stat-item">
                  <div className="stat-item-left">
                    <span style={{fontSize:18}}>💰</span>
                    <div><div className="stat-name">Annual Premium</div></div>
                  </div>
                  <div className="stat-right"><div className="stat-value">{fmt(annualInsurancePremium,true)}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Investment holdings table + Expense breakdown */}
        <div className="grid-2">
          {/* Holdings */}
          <div className="card">
            <div className="card-title">Top Holdings <Link to="/investments">See All →</Link></div>
            <div className="stat-list">
              {investments.slice(0,6).map((item,i)=>{
                const cur = computeCurrentValue(item);
                const inv = computeInvested(item);
                const g = cur-inv;
                const p = inv>0?(g/inv)*100:0;
                const name = item.stockName||item.fundName||item.bankName||item.planName||item.employerName||item.assetName||"—";
                return (
                  <div className="stat-item" key={item.id}>
                    <div className="stat-item-left">
                      <div className="stat-dot" style={{background:INV_COLORS[item.category]||"#94a3b8"}} />
                      <div>
                        <div className="stat-name" style={{maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
                        <div className="stat-sub">{item.category}</div>
                      </div>
                    </div>
                    <div className="stat-right">
                      <div className="stat-value">{fmt(cur,true)}</div>
                      <div className={`stat-pct ${g>=0?"pos":"neg"}`}>{fmtPct(p)}</div>
                    </div>
                  </div>
                );
              })}
              {investments.length===0 && <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No investments yet. <Link to="/investments" style={{color:"var(--accent)"}}>Add some →</Link></div>}
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="card">
            <div className="card-title">Expense Breakdown <Link to="/transactions">See All →</Link></div>
            {expenseData.length===0 ? (
              <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"30px 0"}}>No transaction data yet</div>
            ) : (
              <>
                <div style={{marginBottom:16,display:"flex",gap:16}}>
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Total Expenses</div>
                    <div style={{fontFamily:"var(--font-head)",fontSize:20,fontWeight:700,color:"var(--red)"}}>{fmt(totalExpenses,true)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Total Income</div>
                    <div style={{fontFamily:"var(--font-head)",fontSize:20,fontWeight:700,color:"var(--green)"}}>{fmt(totalIncome,true)}</div>
                  </div>
                </div>
                <div className="exp-bar-row">
                  {expenseData.map((e,i)=>{
                    const pct = (e.value/expMaxVal)*100;
                    const colors=["#f87171","#fb923c","#fbbf24","#34d399","#38bdf8","#a78bfa"];
                    return (
                      <div className="exp-bar-item" key={i}>
                        <div className="exp-bar-label">{e.name}</div>
                        <div className="exp-bar-track">
                          <div className="exp-bar-fill" style={{width:`${pct}%`,background:colors[i%colors.length]}} />
                        </div>
                        <div className="exp-bar-val">{fmt(e.value,true)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 3: Insurance policies list + Investment bar chart */}
        <div className="grid-1-2">
          {/* Insurance policies */}
          <div className="card">
            <div className="card-title">Active Policies <Link to="/insurance">View All →</Link></div>
            {insurance.length===0 ? (
              <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>
                No policies yet. <Link to="/insurance" style={{color:"var(--accent)"}}>Add Insurance →</Link>
              </div>
            ) : insurance.slice(0,5).map(item=>{
              const status = getRenewalStatus(item.renewalDate);
              const icons={Term:"🛡️",Life:"❤️",Health:"🏥"};
              const colors={Term:"var(--blue)",Life:"var(--purple)",Health:"var(--accent)"};
              const statusColor = status==="active"?"var(--green)":status==="expiring"?"var(--amber)":"var(--red)";
              return (
                <div className="ins-row" key={item.id}>
                  <div className="ins-row-left">
                    <div className="ins-icon" style={{background:`${colors[item.type]}15`}}>{icons[item.type]}</div>
                    <div>
                      <div className="ins-name">{item.provider}</div>
                      <div className="ins-plan">{item.planName} · Renews {item.renewalDate||"—"}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="ins-cover" style={{fontSize:13}}>{fmt((item.sumAssured||item.sumInsured),true)}</div>
                    <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end",marginTop:2}}>
                      <div className="status-dot" style={{background:statusColor}} />
                      <span style={{fontSize:10,color:statusColor,fontWeight:600,textTransform:"uppercase"}}>
                        {status==="active"?"Active":status==="expiring"?"Expiring":"Expired"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart by category */}
          <div className="card">
            <div className="card-title">Invested vs Current Value by Category</div>
            {catData.length===0 ? (
              <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"40px 0"}}>
                No investment data yet. <Link to="/investments" style={{color:"var(--accent)"}}>Start Tracking →</Link>
              </div>
            ) : (
              <Bar
                data={{
                  labels: catData.map(e=>e.name),
                  datasets:[
                    {
                      label:"Invested",
                      data: catData.map(e=>e.invested),
                      backgroundColor:"rgba(255,255,255,0.1)",
                      borderRadius:4,
                    },
                    {
                      label:"Current Value",
                      data: catData.map(e=>e.value),
                      backgroundColor: catData.map(e=>INV_COLORS[e.name]||"#94a3b8"),
                      borderRadius:4,
                    }
                  ]
                }}
                options={{
                  responsive:true,
                  maintainAspectRatio:false,
                  plugins:{legend:{labels:{color:"#64748b",font:{size:11}}},tooltip:{callbacks:{label:ctx=>" "+fmt(ctx.parsed.y)}}},
                  scales:{
                    x:{ticks:{color:"#64748b",font:{size:11}},grid:{color:"rgba(255,255,255,0.04)"}},
                    y:{ticks:{color:"#64748b",font:{size:10},callback:v=>v>=100000?"₹"+(v/100000).toFixed(0)+"L":v>=1000?"₹"+(v/1000).toFixed(0)+"K":"₹"+v},grid:{color:"rgba(255,255,255,0.04)"}},
                  }
                }}
                style={{height:220}}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
