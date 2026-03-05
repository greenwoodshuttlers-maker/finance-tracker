import { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function Dashboard(){

// ---------- STATE ----------

// Monthly spend
const [monthlySpend,setMonthlySpend]=useState(0);

// Category summary
const [categoryData,setCategoryData]=useState({});

// Credit card spend
const [cardData,setCardData]=useState({});



// ---------- LOAD DASHBOARD ----------
useEffect(()=>{
 loadDashboard();
 loadCards();
},[]);



// ---------- LOAD MONTHLY + CATEGORY DATA ----------
const loadDashboard = async()=>{

 const now=new Date();

 const monthKey=
   now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");


 // MONTHLY SPEND
 const monthlyRef=doc(db,"monthlySummary",monthKey);
 const monthlySnap=await getDoc(monthlyRef);

 if(monthlySnap.exists()){
  setMonthlySpend(monthlySnap.data().totalSpend || 0);
 }



 // CATEGORY SUMMARY
 const catRef=doc(db,"categorySummary",monthKey);
 const catSnap=await getDoc(catRef);

 if(catSnap.exists()){
  setCategoryData(catSnap.data());
 }

};



// ---------- LOAD CREDIT CARDS ----------
const loadCards = async()=>{

 const snap = await getDocs(collection(db,"cardSummary"));

 const data = {};

 snap.docs.forEach(doc=>{
  data[doc.id] = doc.data().currentCycleSpend || 0;
 });

 setCardData(data);

};



// ---------- CATEGORY CHART ----------
const chartData={
 labels:Object.keys(categoryData),
 datasets:[
  {
   label:"Category Spend",
   data:Object.values(categoryData),
   backgroundColor:"#38bdf8"
  }
 ]
};



// ---------- UI ----------
return(

<div style={{padding:20}}>

<h2>Dashboard</h2>



{/* MONTHLY SPEND CARD */}

<div style={{
 background:"#ffffff",
 padding:20,
 borderRadius:12,
 marginBottom:20,
 boxShadow:"0 3px 10px rgba(0,0,0,0.08)"
}}>

<h3>This Month Spend</h3>

<h1>₹{monthlySpend.toLocaleString()}</h1>

</div>



{/* CATEGORY CHART */}

<div style={{
 background:"#ffffff",
 padding:20,
 borderRadius:12,
 marginBottom:20
}}>

<h3>Category Spend</h3>

{Object.keys(categoryData).length>0 ? (
 <Bar data={chartData}/>
) : (
 <p>No category data yet</p>
)}

</div>



{/* CREDIT CARD SUMMARY */}

<div style={{
 background:"#ffffff",
 padding:20,
 borderRadius:12
}}>

<h3>Credit Card Current Cycle</h3>

{Object.keys(cardData).length>0 ? (

 Object.entries(cardData).map(([card,val])=>(
  <p key={card}>
   <b>{card}</b>: ₹{val.toLocaleString()}
  </p>
 ))

) : (

 <p>No credit card transactions yet</p>

)}

</div>

</div>

);
}