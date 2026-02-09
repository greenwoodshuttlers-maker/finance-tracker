import { Link } from "react-router-dom";

export default function Navbar(){
  return(
    <div style={{
      padding:15,
      background:"#222",
      color:"#fff",
      display:"flex",
      gap:20
    }}>
      <Link to="/dashboard" style={{color:"#fff"}}>Dashboard</Link>
      <Link to="/add" style={{color:"#fff"}}>Add Transaction</Link>
    </div>
  );
}
