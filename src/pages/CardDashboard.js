import { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function CardDashboard(){

// ---------- STATE ----------
const [cards,setCards]=useState([]);
const [transactions,setTransactions]=useState([]);


// ---------- LOAD DATA ----------
useEffect(()=>{
 loadCards();
 loadTransactions();
},[]);


const loadCards = async()=>{

 const snap=await getDocs(collection(db,"creditCards"));

 const list=snap.docs.map(d=>d.data());

 setCards(list);

};


const loadTransactions = async()=>{

 const snap=await getDocs(collection(db,"transactions"));

 const list=snap.docs.map(d=>d.data());

 setTransactions(list);

};



// ---------- CALCULATE BILLING CYCLE ----------
const getCardSpend = (card)=>{

 const billingDate = Number(card.billingDate);

 const now = new Date();

 const start = new Date(
  now.getFullYear(),
  now.getMonth(),
  billingDate
 );

 if(now.getDate() < billingDate){
  start.setMonth(start.getMonth()-1);
 }

 const end = new Date(start);
 end.setMonth(end.getMonth()+1);

 let spend = 0;

 transactions.forEach(t=>{

  if(
   t.cardName === card.cardName &&
   new Date(t.date) >= start &&
   new Date(t.date) < end
  ){
   spend += Number(t.amount || 0);
  }

 });

 return spend;

};



// ---------- UI ----------
return(

<div style={{padding:20}}>

<h2>Credit Card Dashboard</h2>

{cards.map((card,i)=>{

 const spend = getCardSpend(card);

 const limit = Number(card.limit || 0);

 const usedPercent = limit
  ? Math.round((spend/limit)*100)
  : 0;

 return(

<div key={i} style={{
 background:"#fff",
 padding:20,
 marginBottom:15,
 borderRadius:12,
 boxShadow:"0 2px 8px rgba(0,0,0,0.1)"
}}>

<h3>{card.cardName}</h3>

<p>
Billing Date: {card.billingDate}
</p>

<p>
Current Cycle Spend:
<b> ₹{spend.toLocaleString()}</b>
</p>

<p>
Limit Used: {usedPercent}%
</p>

</div>

);

})}

</div>

);

}