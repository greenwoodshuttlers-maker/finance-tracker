// ---------- IMPORTS ----------

// React hooks
import { useState } from "react";

// Firebase auth login function
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebaseConfig";

// Navigation after login
import { useNavigate } from "react-router-dom";

// Reusable UI components
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";


// ---------- COMPONENT ----------

export default function Login() {

  // State to store user inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();


  // ---------- LOGIN FUNCTION ----------
  const login = async () => {

    // Basic validation
    if(!email || !password){
      alert("Please enter email and password");
      return;
    }

    try{
      // Firebase login
      await signInWithEmailAndPassword(auth, email, password);

      // Redirect to dashboard
      navigate("/dashboard");

    }catch(err){
      alert(err.message);
    }
  };


  // ---------- UI ----------
  return (

    <Page>

      {/* App Title */}
      <h2 style={{textAlign:"center"}}>
        Finance Tracker
      </h2>

      <p style={{
        textAlign:"center",
        color:"#64748B",
        marginBottom:30
      }}>
        Track. Analyze. Save smarter.
      </p>


      {/* Email Field */}
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={e=>setEmail(e.target.value)}
      />

      <br/><br/>

      {/* Password Field */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />

      <br/><br/>

      {/* Login Button */}
      <Button onClick={login}>
        Login
      </Button>

      {/* Footer text */}
      <p style={{
        textAlign:"center",
        marginTop:20,
        fontSize:14,
        color:"#94A3B8"
      }}>
        Secure login powered by Firebase 🔐
      </p>

    </Page>
  );
}
