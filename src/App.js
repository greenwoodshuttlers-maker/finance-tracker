import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddTransaction from "./pages/AddTransaction";
import Transactions from "./pages/Transactions";
import Navbar from "./components/Navbar";

function App(){

const [user,setUser]=useState(null);
const [loading,setLoading]=useState(true);

useEffect(()=>{
 const unsub=onAuthStateChanged(auth,(u)=>{
  setUser(u);
  setLoading(false);
 });
 return ()=>unsub();
},[]);

if(loading) return <p>Loading...</p>;

return(
<Router>

{/* Navbar only when logged in */}
{user && <Navbar/>}

<Routes>

<Route path="/" element={<Login/>}/>

{user && (
<>
<Route path="/dashboard" element={<Dashboard/>}/>
<Route path="/add" element={<AddTransaction/>}/>
<Route path="/transactions" element={<Transactions/>}/>
</>
)}

</Routes>

</Router>
);
}

export default App;
