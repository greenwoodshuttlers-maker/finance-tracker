import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{textAlign:"center", marginTop:"100px"}}>
      <h2>Finance Tracker Login</h2>

      <input
        placeholder="Email"
        onChange={e=>setEmail(e.target.value)}
      /><br/><br/>

      <input
        type="password"
        placeholder="Password"
        onChange={e=>setPassword(e.target.value)}
      /><br/><br/>

      <button onClick={login}>Login</button>
    </div>
  );
}
