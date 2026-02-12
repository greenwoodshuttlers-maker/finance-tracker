import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebaseConfig";

export default function Navbar(){

const nav=useNavigate();

const logout=async()=>{
 await signOut(auth);
 nav("/");
};

return(
<div style={{
 padding:15,
 background:"#222",
 display:"flex",
 gap:20,
 color:"#fff"
}}>

<Link to="/dashboard" style={{color:"#fff"}}>Dashboard</Link>
<Link to="/add" style={{color:"#fff"}}>Add Entry</Link>
<Link to="/transactions" style={{color:"#fff"}}>Transactions</Link>

<span
 onClick={logout}
 style={{marginLeft:"auto",cursor:"pointer"}}
>
Logout
</span>

</div>
);
}
