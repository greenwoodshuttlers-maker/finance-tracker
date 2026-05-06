// CreditCards.jsx
// Modern Credit Card Manager
// Features: Real card image, billing cycle, due date alerts, edit, merchant breakdown, spend ordering

import { useState, useEffect, useRef } from "react";
import { db, storage } from "../services/firebaseConfig";
import {
  collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const currencyFmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getDaysUntilDue = (dueDayOfMonth) => {
  const today = new Date();
  const d = Number(dueDayOfMonth);
  if (!d) return null;
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), d);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, d);
  const target = today.getDate() <= d ? thisMonth : nextMonth;
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const getUtilLevel = (spend, limit) => {
  if (!limit || limit <= 0) return "unknown";
  const r = spend / limit;
  if (r >= 0.9) return "critical";
  if (r >= 0.7) return "warning";
  return "safe";
};

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
const T = {
  bg: "linear-gradient(135deg, #F0F4FF 0%, #FAF5FF 100%)",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  indigo: "#6366F1",
  green: "#22C55E",
  greenBg: "#F0FDF4",
  greenBorder: "#86EFAC",
  yellow: "#F59E0B",
  yellowBg: "#FFFBEB",
  yellowBorder: "#FCD34D",
  red: "#EF4444",
  redBg: "#FFF1F2",
  redBorder: "#FECDD3",
  shadow: "0 4px 24px rgba(99,102,241,0.10)",
  shadowSm: "0 2px 12px rgba(0,0,0,0.06)",
};

// Card gradient palettes (used when no custom image)
const CARD_PALETTES = [
  ["#1a1a2e", "#16213e"],
  ["#0f3460", "#533483"],
  ["#1B4332", "#2D6A4F"],
  ["#7B2D8B", "#C2185B"],
  ["#B5451B", "#E8871E"],
  ["#1565C0", "#0097A7"],
];

const BANKS = [
  "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank",
  "Kotak Mahindra", "IndusInd Bank", "Yes Bank",
  "American Express", "Citibank", "RBL Bank", "Other"
];

const NETWORKS = ["Visa", "Mastercard", "RuPay", "Amex", "Diners"];

// ─────────────────────────────────────────────
// FIELD COMPONENT
// ─────────────────────────────────────────────
const Field = ({ label, name, value, onChange, type = "text", placeholder, disabled }) => {
  const [focused, setFocused] = useState(false);
  const hasVal = value !== "" && value != null;
  const lifted = focused || hasVal || type === "date" || type === "number";

  return (
    <div style={{ position: "relative", marginBottom: 18 }}>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={lifted ? (placeholder || "") : " "}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "20px 14px 10px",
          borderRadius: 12,
          border: `1.5px solid ${focused ? T.indigo : T.border}`,
          background: disabled ? "#F8FAFC" : "#FAFAFA",
          fontSize: 15,
          color: T.text,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
      />
      <label style={{
        position: "absolute", left: 14,
        top: lifted ? 6 : "50%",
        transform: lifted ? "none" : "translateY(-50%)",
        fontSize: lifted ? 11 : 15,
        fontWeight: lifted ? 600 : 400,
        color: focused ? T.indigo : "#94A3B8",
        background: disabled ? "#F8FAFC" : "#FAFAFA",
        padding: "0 3px",
        transition: "all 0.18s",
        pointerEvents: "none",
        textTransform: lifted ? "uppercase" : "none",
        letterSpacing: lifted ? "0.04em" : 0,
      }}>
        {label}
      </label>
    </div>
  );
};

const StyledSelect = ({ label, name, value, onChange, options }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{
      display: "block", fontSize: 11, fontWeight: 600,
      color: "#94A3B8", textTransform: "uppercase",
      letterSpacing: "0.04em", marginBottom: 6, paddingLeft: 4
    }}>{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "13px 16px", borderRadius: 12,
        border: `1.5px solid ${T.border}`, background: "#FAFAFA",
        fontSize: 15, color: T.text, outline: "none",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='[w3.org](http://www.w3.org/2000/svg)' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        boxSizing: "border-box",
      }}
    >
      <option value="">Select {label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─────────────────────────────────────────────
// VISUAL CREDIT CARD (front face)
// ─────────────────────────────────────────────
const VisualCard = ({ card, spend, paletteIndex }) => {
  const [colors] = useState(CARD_PALETTES[paletteIndex % CARD_PALETTES.length]);
  const daysLeft = getDaysUntilDue(card.dueDate);
  const limit = Number(card.limit || 0);
  const utilPct = limit > 0 ? Math.min((spend / limit) * 100, 100) : null;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "1.586",
      borderRadius: 20,
      overflow: "hidden",
      background: card.cardImageUrl
        ? `url(${card.cardImageUrl}) center/cover`
        : `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
      color: "#fff",
      fontFamily: "'Courier New', monospace",
      userSelect: "none",
    }}>

      {/* Dark overlay for readability when custom image */}
      {card.cardImageUrl && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg,rgba(0,0,0,0.55),rgba(0,0,0,0.35))",
          borderRadius: 20
        }} />
      )}

      {/* Decorative circles */}
      {!card.cardImageUrl && (
        <>
          <div style={{
            position: "absolute", width: 200, height: 200,
            borderRadius: "50%", background: "rgba(255,255,255,0.06)",
            top: -60, right: -40
          }} />
          <div style={{
            position: "absolute", width: 150, height: 150,
            borderRadius: "50%", background: "rgba(255,255,255,0.05)",
            bottom: -50, left: 20
          }} />
        </>
      )}

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "18px 22px",
        height: "100%", boxSizing: "border-box",
        display: "flex", flexDirection: "column", justifyContent: "space-between"
      }}>

        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {card.bank || "Bank"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2, letterSpacing: "0.02em" }}>
              {card.cardName}
            </div>
          </div>
          {/* Chip */}
          <div style={{
            width: 36, height: 26, borderRadius: 5,
            background: "linear-gradient(135deg, #FFD700, #DAA520)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 1, padding: 3, boxSizing: "border-box"
          }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 1 }} />
            ))}
          </div>
        </div>

        {/* Middle — masked card number style */}
        <div style={{
          display: "flex", gap: 10, alignItems: "center",
          fontSize: 16, letterSpacing: "0.18em", opacity: 0.85
        }}>
          <span>••••</span><span>••••</span><span>••••</span>
          <span style={{ opacity: 0.6, fontSize: 12 }}>XXXX</span>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>

          <div>
            <div style={{ fontSize: 9, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Current Bill
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
              {currencyFmt(spend)}
            </div>
            {utilPct !== null && (
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                {utilPct.toFixed(0)}% of {currencyFmt(limit)}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            {daysLeft !== null && (
              <div style={{
                background: daysLeft <= 3 ? "#EF4444"
                  : daysLeft <= 7 ? "#F59E0B"
                  : "rgba(255,255,255,0.2)",
                borderRadius: 8, padding: "4px 10px",
                fontSize: 11, fontWeight: 700,
                marginBottom: 4,
              }}>
                {daysLeft <= 0 ? "⚠️ Due Today!" : `Due in ${daysLeft}d`}
              </div>
            )}
            <div style={{ fontSize: 10, opacity: 0.65, textTransform: "uppercase" }}>
              {card.network || ""}
            </div>
          </div>

        </div>

      </div>

      {/* Utilization bar at bottom */}
      {utilPct !== null && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          background: "rgba(255,255,255,0.15)"
        }}>
          <div style={{
            height: 4,
            width: `${utilPct}%`,
            background: utilPct >= 90 ? "#EF4444"
              : utilPct >= 70 ? "#F59E0B"
              : "#22C55E",
            transition: "width 0.6s ease"
          }} />
        </div>
      )}

    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function CreditCards() {

  const [activeTab, setActiveTab] = useState("dashboard");
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Edit mode
  const [editingCard, setEditingCard] = useState(null);

  // Add card form
  const [form, setForm] = useState({
    cardName: "", bank: "", network: "",
    billingDate: "", dueDate: "", limit: "",
    cardImageUrl: "",
  });
  const [cardImageFile, setCardImageFile] = useState(null);
  const [cardImagePreview, setCardImagePreview] = useState(null);
  const [savingCard, setSavingCard] = useState(false);
  const imageRef = useRef();

  useEffect(() => {
    loadCards();
    loadTransactions();
  }, []);

  // ── Load ──
  const loadCards = async () => {
    const snap = await getDocs(collection(db, "creditCards"));
    setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadTransactions = async () => {
    const snap = await getDocs(collection(db, "transactions"));
    setTransactions(snap.docs.map((d) => d.data()));
  };

  // ── Billing calc ──
  const getCardCycleInfo = (card) => {
    const billingDate = Number(card.billingDate);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), billingDate);
    if (now.getDate() < billingDate) start.setMonth(start.getMonth() - 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    let spend = 0;
    const merchantSpend = {};
    const categorySpend = {};
    const recentTxns = [];

    transactions.forEach((t) => {
      if (
        t.cardName === card.cardName &&
        new Date(t.date) >= start &&
        new Date(t.date) < end
      ) {
        const amt = Number(t.amount || 0);
        spend += amt;
        const m = t.merchant || "Other";
        merchantSpend[m] = (merchantSpend[m] || 0) + amt;
        const c = t.category || "Uncategorized";
        categorySpend[c] = (categorySpend[c] || 0) + amt;
        recentTxns.push(t);
      }
    });

    recentTxns.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { spend, merchantSpend, categorySpend, recentTxns, start, end };
  };

  // ── Image upload for card ──
  const handleCardImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true
    });
    setCardImageFile(compressed);
    setCardImagePreview(URL.createObjectURL(compressed));
  };

  // ── Form handlers ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Save / update card ──
  const saveCard = async () => {
    if (!form.cardName) { alert("Card name is required."); return; }
    setSavingCard(true);
    try {
      let imageUrl = form.cardImageUrl || "";

      if (cardImageFile) {
        const imgRef = ref(storage, `cardImages/${form.cardName}_${Date.now()}`);
        await uploadBytes(imgRef, cardImageFile);
        imageUrl = await getDownloadURL(imgRef);
      }

      const payload = { ...form, cardImageUrl: imageUrl };

      if (editingCard) {
        await updateDoc(doc(db, "creditCards", editingCard), payload);
      } else {
        await addDoc(collection(db, "creditCards"), payload);
      }

      resetForm();
      loadCards();
      setActiveTab("dashboard");
    } catch (err) {
      console.error(err);
      alert("Save failed. Check console.");
    } finally {
      setSavingCard(false);
    }
  };

  const resetForm = () => {
    setForm({ cardName: "", bank: "", network: "", billingDate: "", dueDate: "", limit: "", cardImageUrl: "" });
    setCardImageFile(null);
    setCardImagePreview(null);
    setEditingCard(null);
  };

  const startEdit = (card) => {
    setForm({
      cardName: card.cardName || "",
      bank: card.bank || "",
      network: card.network || "",
      billingDate: card.billingDate || "",
      dueDate: card.dueDate || "",
      limit: card.limit || "",
      cardImageUrl: card.cardImageUrl || "",
    });
    setCardImagePreview(card.cardImageUrl || null);
    setEditingCard(card.id);
    setActiveTab("add");
  };

  const deleteCard = async (id) => {
    if (!window.confirm("Delete this card?")) return;
    await deleteDoc(doc(db, "creditCards", id));
    loadCards();
  };

  // ── Sort cards: highest spend first, zero-spend last ──
  const sortedCards = [...cards].sort((a, b) => {
    const sa = getCardCycleInfo(a).spend;
    const sb = getCardCycleInfo(b).spend;
    if (sa === 0 && sb === 0) return 0;
    if (sa === 0) return 1;
    if (sb === 0) return -1;
    return sb - sa;
  });

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{
      background: T.bg,
      minHeight: "100vh",
      padding: "24px 16px 60px",
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: 640, margin: "auto" }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0 }}>💳 Credit Cards</h1>
            <p style={{ color: T.sub, margin: "4px 0 0", fontSize: 13 }}>
              {cards.length} card{cards.length !== 1 ? "s" : ""} · Billing & spend tracker
            </p>
          </div>
        </div>

        {/* ══ TAB BAR ══ */}
        <div style={{
          display: "flex", background: "#F1F5F9", borderRadius: 14,
          padding: 4, marginBottom: 28, gap: 4
        }}>
          {[
            { key: "dashboard", icon: "🃏", label: "Cards" },
            { key: "billing", icon: "📅", label: "Billing" },
            { key: "add", icon: editingCard ? "✏️" : "➕", label: editingCard ? "Edit Card" : "Add Card" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key !== "add") resetForm();
                setActiveTab(tab.key);
              }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 11, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 14,
                transition: "all 0.2s",
                background: activeTab === tab.key ? T.indigo : "transparent",
                color: activeTab === tab.key ? "#fff" : T.sub,
                boxShadow: activeTab === tab.key ? "0 2px 8px rgba(99,102,241,0.28)" : "none",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>


        {/* ══════════════════════════════════════
            TAB: DASHBOARD
        ══════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div>
            {sortedCards.length === 0 && (
              <div style={{
                background: T.card, borderRadius: 20, padding: "48px 24px",
                textAlign: "center", boxShadow: T.shadowSm
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>No cards yet</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 6, marginBottom: 20 }}>
                  Add your first credit card to start tracking
                </div>
                <button
                  onClick={() => setActiveTab("add")}
                  style={{
                    background: T.indigo, color: "#fff", border: "none",
                    borderRadius: 12, padding: "12px 28px", fontWeight: 700,
                    fontSize: 14, cursor: "pointer"
                  }}
                >
                  ➕ Add Card
                </button>
              </div>
            )}

            {sortedCards.map((card, i) => {
              const { spend, merchantSpend, categorySpend, recentTxns, start, end } = getCardCycleInfo(card);
              const isOpen = expanded[card.cardName];
              const daysLeft = getDaysUntilDue(card.dueDate);
              const limit = Number(card.limit || 0);
              const level = getUtilLevel(spend, limit);

              const alertBorder = level === "critical" ? T.redBorder
                : level === "warning" ? T.yellowBorder
                : T.border;

              return (
                <div key={card.id} style={{ marginBottom: 24 }}>

                  {/* Visual card */}
                  <VisualCard card={card} spend={spend} paletteIndex={i} />

                  {/* Detail panel */}
                  <div style={{
                    background: T.card,
                    border: `1.5px solid ${alertBorder}`,
                    borderRadius: "0 0 20px 20px",
                    marginTop: -10,
                    paddingTop: 18,
                    padding: "18px 20px 16px",
                    boxShadow: T.shadowSm,
                  }}>

                    {/* Billing cycle info */}
                    <div style={{
                      display: "flex", gap: 8, flexWrap: "wrap",
                      marginBottom: 12, alignItems: "center"
                    }}>
                      <span style={{
                        background: "#EEF2FF", color: T.indigo,
                        borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600
                      }}>
                        🔄 Cycle: {start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>

                      {card.billingDate && (
                        <span style={{
                          background: "#F8FAFC", color: T.sub,
                          borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600
                        }}>
                          📋 Bill: {ordinal(Number(card.billingDate))} every month
                        </span>
                      )}

                      {daysLeft !== null && (
                        <span style={{
                          background: daysLeft <= 3 ? T.redBg : daysLeft <= 7 ? T.yellowBg : T.greenBg,
                          color: daysLeft <= 3 ? T.red : daysLeft <= 7 ? T.yellow : "#16A34A",
                          border: `1px solid ${daysLeft <= 3 ? T.redBorder : daysLeft <= 7 ? T.yellowBorder : T.greenBorder}`,
                          borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700
                        }}>
                          {daysLeft <= 0 ? "🚨 Payment Due Today!" : daysLeft <= 3 ? `🚨 Pay in ${daysLeft}d` : daysLeft <= 7 ? `⚠️ Due in ${daysLeft}d` : `✅ Due in ${daysLeft}d`}
                        </span>
                      )}
                    </div>

                    {/* Spend alert */}
                    {level === "critical" && (
                      <div style={{
                        background: T.redBg, border: `1px solid ${T.redBorder}`,
                        borderRadius: 10, padding: "10px 14px", marginBottom: 12,
                        fontSize: 13, fontWeight: 600, color: T.red
                      }}>
                        🚨 You've used {((spend / limit) * 100).toFixed(0)}% of your credit limit. Avoid new charges.
                      </div>
                    )}
                    {level === "warning" && (
                      <div style={{
                        background: T.yellowBg, border: `1px solid ${T.yellowBorder}`,
                        borderRadius: 10, padding: "10px 14px", marginBottom: 12,
                        fontSize: 13, fontWeight: 600, color: "#92400E"
                      }}>
                        ⚠️ {((spend / limit) * 100).toFixed(0)}% of limit used — spend is getting high.
                      </div>
                    )}

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [card.cardName]: !p[card.cardName] }))}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 10,
                        border: `1.5px solid ${T.border}`, background: "#FAFAFA",
                        color: T.sub, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        marginBottom: isOpen ? 14 : 0,
                      }}
                    >
                      {isOpen ? "▲ Hide Details" : "▼ View Transactions & Breakdown"}
                    </button>

                    {/* Expanded details */}
                    {isOpen && (
                      <div>

                        {/* Merchant breakdown */}
                        {Object.keys(merchantSpend).length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{
                              fontSize: 11, fontWeight: 700, color: T.sub,
                              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10
                            }}>
                              🏪 Top Merchants
                            </div>
                            {Object.entries(merchantSpend)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 5)
                              .map(([m, val]) => {
                                const maxVal = Math.max(...Object.values(merchantSpend));
                                return (
                                  <div key={m} style={{ marginBottom: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                      <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{m}</span>
                                      <span style={{ fontSize: 13, color: T.indigo, fontWeight: 700 }}>{currencyFmt(val)}</span>
                                    </div>
                                    <div style={{ height: 4, background: "#F1F5F9", borderRadius: 999 }}>
                                      <div style={{
                                        height: 4, width: `${(val / maxVal) * 100}%`,
                                        background: T.indigo, borderRadius: 999, transition: "width 0.4s"
                                      }} />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Category breakdown */}
                        {Object.keys(categorySpend).length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{
                              fontSize: 11, fontWeight: 700, color: T.sub,
                              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10
                            }}>
                              🏷️ By Category
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {Object.entries(categorySpend)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, val]) => (
                                  <div key={cat} style={{
                                    background: "#EEF2FF", borderRadius: 10,
                                    padding: "6px 12px", fontSize: 12,
                                    color: T.indigo, fontWeight: 600
                                  }}>
                                    {cat} · {currencyFmt(val)}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Recent transactions */}
                        {recentTxns.length > 0 && (
                          <div>
                            <div style={{
                              fontSize: 11, fontWeight: 700, color: T.sub,
                              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10
                            }}>
                              🕐 Recent Transactions
                            </div>
                            {recentTxns.slice(0, 6).map((t, idx) => (
                              <div key={idx} style={{
                                display: "flex", justifyContent: "space-between",
                                alignItems: "center", padding: "8px 0",
                                borderBottom: idx < recentTxns.slice(0, 6).length - 1
                                  ? `1px solid ${T.border}` : "none"
                              }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                                    {t.merchant || t.recipientName || "Transaction"}
                                  </div>
                                  <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>
                                    {t.category} · {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                  </div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.red }}>
                                  -{currencyFmt(t.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    )}

                    {/* Edit / Delete actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => startEdit(card)}
                        style={{
                          flex: 1, padding: "10px", borderRadius: 10,
                          border: `1.5px solid ${T.indigo}`, background: "#EEF2FF",
                          color: T.indigo, fontWeight: 600, fontSize: 13, cursor: "pointer"
                        }}
                      >
                        ✏️ Edit Card
                      </button>
                      <button
                        onClick={() => deleteCard(card.id)}
                        style={{
                          padding: "10px 16px", borderRadius: 10,
                          border: `1.5px solid ${T.redBorder}`, background: T.redBg,
                          color: T.red, fontWeight: 600, fontSize: 13, cursor: "pointer"
                        }}
                      >
                        🗑️
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* ══════════════════════════════════════
            TAB: BILLING TRACKER
        ══════════════════════════════════════ */}
        {activeTab === "billing" && (
          <div>
            {sortedCards.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: T.sub }}>
                No cards to track. Add a card first.
              </div>
            )}

            {sortedCards.map((card, i) => {
              const { spend, start, end } = getCardCycleInfo(card);
              const daysLeft = getDaysUntilDue(card.dueDate);
              const limit = Number(card.limit || 0);
              const level = getUtilLevel(spend, limit);

              return (
                <div key={card.id} style={{
                  background: T.card,
                  border: `1.5px solid ${level === "critical" ? T.redBorder : level === "warning" ? T.yellowBorder : T.border}`,
                  borderRadius: 20, padding: 20,
                  marginBottom: 16, boxShadow: T.shadowSm
                }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{card.cardName}</div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{card.bank}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{currencyFmt(spend)}</div>
                      {limit > 0 && (
                        <div style={{ fontSize: 11, color: T.sub }}>of {currencyFmt(limit)} limit</div>
                      )}
                    </div>
                  </div>

                  {/* Info grid */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    gap: 10, marginBottom: 14
                  }}>
                    {[
                      { icon: "🔄", label: "Billing Date", value: card.billingDate ? `${ordinal(Number(card.billingDate))} of month` : "—" },
                      { icon: "📅", label: "Due Date", value: card.dueDate ? `${ordinal(Number(card.dueDate))} of month` : "—" },
                      { icon: "📆", label: "Cycle Start", value: start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                      { icon: "📆", label: "Cycle End", value: end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                    ].map(({ icon, label, value }) => (
                      <div key={label} style={{
                        background: "#F8FAFC", borderRadius: 12,
                        padding: "10px 14px"
                      }}>
                        <div style={{ fontSize: 10, color: T.sub, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                          {icon} {label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 3 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Due date alert */}
                  {daysLeft !== null && (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: 12,
                      background: daysLeft <= 3 ? T.redBg : daysLeft <= 7 ? T.yellowBg : T.greenBg,
                      border: `1px solid ${daysLeft <= 3 ? T.redBorder : daysLeft <= 7 ? T.yellowBorder : T.greenBorder}`,
                    }}>
                      <span style={{
                        fontWeight: 700, fontSize: 13,
                        color: daysLeft <= 3 ? T.red : daysLeft <= 7 ? "#92400E" : "#16A34A"
                      }}>
                        {daysLeft <= 0
                          ? "🚨 Payment Due Today!"
                          : daysLeft <= 3
                          ? `🚨 Pay now — only ${daysLeft} day${daysLeft > 1 ? "s" : ""} left!`
                          : daysLeft <= 7
                          ? `⚠️ Payment due in ${daysLeft} days`
                          : `✅ Payment due in ${daysLeft} days`}
                      </span>
                      {limit > 0 && (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: level === "critical" ? T.red : level === "warning" ? T.yellow : "#16A34A"
                        }}>
                          {((spend / limit) * 100).toFixed(0)}% used
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {limit > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999 }}>
                        <div style={{
                          height: 8,
                          width: `${Math.min((spend / limit) * 100, 100)}%`,
                          borderRadius: 999,
                          background: level === "critical" ? T.red : level === "warning" ? T.yellow : T.green,
                          transition: "width 0.5s ease"
                        }} />
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}


        {/* ══════════════════════════════════════
            TAB: ADD / EDIT CARD
        ══════════════════════════════════════ */}
        {activeTab === "add" && (
          <div style={{
            background: T.card, borderRadius: 24,
            padding: "24px 22px", boxShadow: T.shadow
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 13,
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
              }}>
                {editingCard ? "✏️" : "💳"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: T.text }}>
                  {editingCard ? "Edit Card" : "Add New Card"}
                </div>
                <div style={{ fontSize: 12, color: T.sub }}>
                  {editingCard ? "Update your card details" : "No full card number stored — privacy first"}
                </div>
              </div>
            </div>

            {/* Card image upload */}
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: T.sub,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10
              }}>
                Card Background Image (optional)
              </div>

              <input
                ref={imageRef} type="file"
                accept="image/*" style={{ display: "none" }}
                onChange={handleCardImage}
              />

              {cardImagePreview ? (
                <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 10 }}>
                  <img
                    src={cardImagePreview} alt="Card"
                    style={{ width: "100%", aspectRatio: "1.586", objectFit: "cover", borderRadius: 16 }}
                  />
                  <button
                    onClick={() => { setCardImagePreview(null); setCardImageFile(null); setForm(p => ({ ...p, cardImageUrl: "" })); }}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      background: "rgba(0,0,0,0.6)", color: "#fff",
                      border: "none", borderRadius: 8, padding: "6px 12px",
                      cursor: "pointer", fontSize: 12, fontWeight: 600
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => imageRef.current.click()}
                  style={{
                    width: "100%", padding: 16, borderRadius: 14,
                    border: "2px dashed #C7D2FE", background: "#F5F3FF",
                    color: T.indigo, fontSize: 14, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  📷 Upload Card Image
                </button>
              )}
              <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>
                Upload a photo of your physical card design (front). No sensitive data stored — only the card artwork.
              </div>
            </div>

            <Field label="Card Name (e.g. HDFC Millennia)" name="cardName" value={form.cardName} onChange={handleChange} />
            <StyledSelect label="Bank" name="bank" value={form.bank} onChange={handleChange} options={BANKS} />
            <StyledSelect label="Network" name="network" value={form.network} onChange={handleChange} options={NETWORKS} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="Billing Date (day of month)"
                name="billingDate"
                type="number"
                value={form.billingDate}
                onChange={handleChange}
                placeholder="e.g. 15"
              />
              <Field
                label="Payment Due Date (day)"
                name="dueDate"
                type="number"
                value={form.dueDate}
                onChange={handleChange}
                placeholder="e.g. 5"
              />
            </div>

            <Field
              label="Credit Limit (₹)"
              name="limit"
              type="number"
              value={form.limit}
              onChange={handleChange}
              placeholder="e.g. 100000"
            />

            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              borderRadius: 12, padding: "12px 16px", marginBottom: 22, fontSize: 12, color: "#166534"
            }}>
              🔒 We never store card numbers, expiry dates, or CVV — only the card name, bank, and spending metadata.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={saveCard}
                disabled={savingCard}
                style={{
                  flex: 1, padding: "16px 0", borderRadius: 14, border: "none",
                  background: savingCard ? "#A5B4FC" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color: "#fff", fontSize: 16, fontWeight: 700, cursor: savingCard ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(99,102,241,0.3)"
                }}
              >
                {savingCard ? "Saving..." : editingCard ? "💾 Update Card" : "💳 Add Card"}
              </button>

              {editingCard && (
                <button
                  onClick={() => { resetForm(); setActiveTab("dashboard"); }}
                  style={{
                    padding: "16px 20px", borderRadius: 14,
                    border: `1.5px solid ${T.border}`, background: "#fff",
                    color: T.sub, fontSize: 15, cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
