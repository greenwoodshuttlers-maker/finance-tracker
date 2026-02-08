import { signOut } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Dashboard(){
  const navigate = useNavigate();

  const logout = async ()=>{
    await signOut(auth);
    navigate("/");
  };

  return(
    <div style={{textAlign:"center", marginTop:"100px"}}>
      <h2>Dashboard</h2>

      <button onClick={()=>navigate("/add")}>
        Add Transaction
      </button>

      <br/><br/>

      <button onClick={logout}>
        Logout
      </button>
    </div>
  );
}
