import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const navLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: "/investments",
    label: "Investments",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    to: "/insurance",
    label: "Insurance",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  // ── NEW: Budget ──────────────────────────────────────────────────────────────
  {
    to: "/budget",
    label: "Budget",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  // ── NEW: Reminders (with live badge) ─────────────────────────────────────────
  {
    to: "/reminders",
    label: "Reminders",
    badge: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    to: "/add",
    label: "Add Entry",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    to: "/transactions",
    label: "Transactions",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    to: "/cards",
    label: "Credit Cards",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    to: "/card-dashboard",
    label: "Card Dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reminderBadge, setReminderBadge] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Re-check reminder badge on every page navigation
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDocs(collection(db, "reminders", uid, "entries"))
      .then((snap) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const count = snap.docs.filter((d) => {
          const data = d.data();
          if (data.status === "paid") return false;
          if (!data.dueDate) return false;
          const due = new Date(data.dueDate); due.setHours(0, 0, 0, 0);
          const days = Math.round((due - today) / 86400000);
          return days <= 7; // show badge for overdue + due within 7 days
        }).length;
        setReminderBadge(count);
      })
      .catch(() => {});
  }, [location.pathname]);

  const logout = async () => {
    await signOut(auth);
    nav("/");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');

        :root {
          --bg: #0b0f1a;
          --surface: #111827;
          --border: rgba(255,255,255,0.07);
          --accent: #22d3a5;
          --accent-dim: rgba(34,211,165,0.12);
          --text: #f1f5f9;
          --muted: #64748b;
          --danger: #f87171;
          --danger-dim: rgba(248,113,113,0.1);
          --shadow: 0 8px 32px rgba(0,0,0,0.4);
          --nav-h: 60px;
        }

        .nb-root {
          position: sticky; top: 0; z-index: 100;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
          background: ${scrolled ? "rgba(11,15,26,0.95)" : "#0b0f1a"};
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid ${scrolled ? "var(--border)" : "transparent"};
          box-shadow: ${scrolled ? "var(--shadow)" : "none"};
        }
        .nb-inner {
          max-width: 1280px; margin: 0 auto; height: var(--nav-h);
          display: flex; align-items: center; padding: 0 24px; gap: 4px;
        }
        .nb-brand {
          display: flex; align-items: center; gap: 9px;
          margin-right: 16px; text-decoration: none; flex-shrink: 0;
        }
        .nb-brand-icon {
          width: 30px; height: 30px; background: var(--accent); border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 14px rgba(34,211,165,0.3);
        }
        .nb-brand-name {
          font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px;
          color: var(--text); letter-spacing: -0.3px;
        }
        .nb-brand-name span { color: var(--accent); }
        .nb-links {
          display: flex; align-items: center; gap: 1px; flex: 1; overflow-x: auto;
        }
        .nb-links::-webkit-scrollbar { display: none; }
        .nb-link {
          display: flex; align-items: center; gap: 6px; padding: 6px 11px;
          border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;
          color: var(--muted); transition: color 0.2s, background 0.2s; white-space: nowrap;
          position: relative;
        }
        .nb-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
        .nb-link.active { color: var(--accent); background: var(--accent-dim); }
        .nb-link svg { flex-shrink: 0; }

        /* Reminder badge — sits top-right of the link */
        .nb-badge {
          position: absolute; top: 1px; right: 2px;
          background: #f87171; color: #fff;
          border-radius: 20px; font-size: 10px; font-weight: 700;
          padding: 1px 5px; line-height: 1.5;
          border: 1.5px solid #0b0f1a;
          pointer-events: none;
        }

        .nb-right { margin-left: auto; flex-shrink: 0; }
        .nb-logout {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px;
          border-radius: 8px; border: 1px solid rgba(248,113,113,0.25);
          background: transparent; color: var(--danger); font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .nb-logout:hover { background: var(--danger-dim); border-color: rgba(248,113,113,0.5); transform: translateY(-1px); }
        .nb-hamburger {
          display: none; flex-direction: column; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 6px; margin-left: auto;
        }
        .nb-hamburger span {
          display: block; width: 20px; height: 2px; background: var(--text);
          border-radius: 2px; transition: transform 0.3s, opacity 0.3s; transform-origin: center;
        }
        .nb-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nb-hamburger.open span:nth-child(2) { opacity: 0; }
        .nb-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .nb-drawer {
          display: none; flex-direction: column; gap: 3px; padding: 10px 14px 14px;
          border-top: 1px solid var(--border); background: rgba(11,15,26,0.98);
          backdrop-filter: blur(16px); animation: slideDown 0.2s ease;
        }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .nb-drawer .nb-link { padding: 10px 12px; font-size: 14px; }
        .nb-drawer .nb-logout { margin-top: 8px; justify-content: center; }
        @media (max-width: 960px) {
          .nb-links { display: none; }
          .nb-right  { display: none; }
          .nb-hamburger { display: flex; }
          .nb-drawer { display: flex; }
        }
      `}</style>

      <nav className="nb-root">
        <div className="nb-inner">
          <Link to="/dashboard" className="nb-brand">
            <div className="nb-brand-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="nb-brand-name">Fin<span>Track</span></span>
          </Link>

          {/* Desktop links */}
          <div className="nb-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nb-link${location.pathname === link.to ? " active" : ""}`}
              >
                {link.icon}
                {link.label}
                {link.badge && reminderBadge > 0 && (
                  <span className="nb-badge">{reminderBadge}</span>
                )}
              </Link>
            ))}
          </div>

          <div className="nb-right">
            <button className="nb-logout" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>

          <button
            className={`nb-hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="nb-drawer">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nb-link${location.pathname === link.to ? " active" : ""}`}
              >
                {link.icon}
                {link.label}
                {link.badge && reminderBadge > 0 && (
                  <span className="nb-badge">{reminderBadge}</span>
                )}
              </Link>
            ))}
            <button className="nb-logout" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </nav>
    </>
  );
}