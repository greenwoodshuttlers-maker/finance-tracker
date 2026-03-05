import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddTransaction from "./pages/AddTransaction";
import Transactions from "./pages/Transactions";
import Navbar from "./components/Navbar";
import CreditCards from "./pages/CreditCards";
import CardDashboard from "./pages/CardDashboard";

function App(){

// ---------- AUTH STATE ----------
const [user,setUser]=useState(null);
const [loading,setLoading]=useState(true);


// ---------- CHECK LOGIN ----------
useEffect(()=>{

 const unsub = onAuthStateChanged(auth,(u)=>{
  setUser(u);
  setLoading(false);
 });

 return ()=>unsub();

},[]);


// ---------- PREVENT UI FLASH ----------
if(loading) return <p>Loading...</p>;



return(

<Router>

{/* Navbar visible only when logged in */}
{user && <Navbar/>}

<Routes>

{/* Root route */}
<Route path="/" element={user ? <Dashboard/> : <Login/>}/>

{/* Protected routes */}
{user && (
<>
<Route path="/dashboard" element={<Dashboard/>}/>
<Route path="/add" element={<AddTransaction/>}/>
<Route path="/transactions" element={<Transactions/>}/>
<Route path="/cards" element={<CreditCards/>}/>
<Route path="/card-dashboard" element={<CardDashboard/>}/>
</>
)}

{/* Fallback */}
<Route path="*" element={<Login/>}/>

</Routes>

</Router>

);

}

export default App;