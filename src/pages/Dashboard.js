import { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function Dashboard(){

const [transactions,setTransactions]=useState([]);
const [fromDate,setFromDate]=useState("");
const [toDate,setToDate]=useState("");

// Example billing cycles
const billingCycles={
  "HDFC Regalia":5,
  "SBI Cashback":10,
  "Axis Ace":15
};

// ---------- FETCH ----------

useEffect(()=>{
  fetchData();
},[]);

const fetchData=async()=>{
  const snap=await getDocs(collection(db,"transactions"));
  setTransactions(snap.docs.map(d=>d.data()));
};

// ---------- FILTER ----------

const filtered=transactions.filter(t=>{
  if(!fromDate||!toDate) return true;

  const d=new Date(t.createdAt?.seconds*1000);
  return d>=new Date(fromDate)&&d<=new Date(toDate);
});

// ---------- TOTAL ----------

const total=filtered.reduce((s,t)=>s+Number(t.amount||0),0);

// ---------- CATEGORY ----------

const catAgg={};
filtered.forEach(t=>{
  const c=t.category||"Others";
  catAgg[c]=(catAgg[c]||0)+Number(t.amount||0);
});

// ---------- CREDIT CARD BILLING ----------

const cardAgg={};

filtered.forEach(t=>{
  if(t.transactionType==="Credit Card"){
    const card=t.cardName||"Unknown";

    const txnDate=new Date(t.createdAt?.seconds*1000);
    const billStart=billingCycles[card]||1;

    if(txnDate.getDate()>=billStart){
      cardAgg[card]=(cardAgg[card]||0)+Number(t.amount||0);
    }
  }
});

// ---------- CHART ----------

const chartData={
  labels:Object.keys(catAgg),
  datasets:[
    {label:"Category Spend",data:Object.values(catAgg)}
  ]
};

return(
<div style={{padding:20}}>

<h2>Dashboard</h2>

{/* DATE FILTER */}
<label>From:</label>
<input type="date" onChange={e=>setFromDate(e.target.value)}/>

<label> To:</label>
<input type="date" onChange={e=>setToDate(e.target.value)}/>

<hr/>

<h1>₹{total.toLocaleString()}</h1>
<p>Total Spend</p>

<hr/>

<h3>Category Spend</h3>
<Bar data={chartData}/>

<hr/>

<h3>Credit Card (Current Cycle)</h3>

{Object.entries(cardAgg).map(([card,val])=>(
  <p key={card}>
    <b>{card}</b>: ₹{val.toLocaleString()}
  </p>
))}

</div>
);
}
