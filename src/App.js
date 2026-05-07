import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebaseConfig";

// ── Existing pages ────────────────────────────────────────────────────────────
import Login          from "./pages/Login";
import Dashboard      from "./pages/Dashboard";
import Investments    from "./pages/Investments";
import Insurance      from "./pages/Insurance";
import AddTransaction from "./pages/AddTransaction";
import Transactions   from "./pages/Transactions";
import CreditCards    from "./pages/CreditCards";
import CardDashboard  from "./pages/CardDashboard";

// ── New pages ─────────────────────────────────────────────────────────────────
import Budget    from "./pages/Budget";
import Reminders from "./pages/Reminders";

// ── Navbar ────────────────────────────────────────────────────────────────────
import Navbar from "./components/Navbar";

// Top-navbar layout — content flows full width below the navbar
function AppLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <div style={{ width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser]       = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0b0f1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#22d3a5", fontFamily: "'Syne', sans-serif",
        fontSize: 20, fontWeight: 700,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/"      element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />

        {/* Protected — top navbar + full-width content below */}
        <Route path="/dashboard"      element={user ? <AppLayout><Dashboard /></AppLayout>      : <Navigate to="/login" />} />
        <Route path="/investments"    element={user ? <AppLayout><Investments /></AppLayout>    : <Navigate to="/login" />} />
        <Route path="/insurance"      element={user ? <AppLayout><Insurance /></AppLayout>      : <Navigate to="/login" />} />
        <Route path="/add"            element={user ? <AppLayout><AddTransaction /></AppLayout> : <Navigate to="/login" />} />
        <Route path="/transactions"   element={user ? <AppLayout><Transactions /></AppLayout>   : <Navigate to="/login" />} />
        <Route path="/cards"          element={user ? <AppLayout><CreditCards /></AppLayout>    : <Navigate to="/login" />} />
        <Route path="/card-dashboard" element={user ? <AppLayout><CardDashboard /></AppLayout>  : <Navigate to="/login" />} />

        {/* ── NEW ── */}
        <Route path="/budget"    element={user ? <AppLayout><Budget /></AppLayout>    : <Navigate to="/login" />} />
        <Route path="/reminders" element={user ? <AppLayout><Reminders /></AppLayout> : <Navigate to="/login" />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}