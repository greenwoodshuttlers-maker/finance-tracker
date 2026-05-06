// ─────────────────────────────────────────────────────────────
// CardDashboard.jsx — Advanced Credit Card Analytics
// Features:
//   - Visual card with real artwork support
//   - Billing cycle countdown with color-coded urgency
//   - Credit utilization ring + bar
//   - Spend trend (last 6 billing cycles)
//   - Category & merchant breakdown per card
//   - Daily spend pattern for current cycle
//   - Bill payment status tracker
//   - Summary overview at top
//   - Fully mobile-first
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import "chart.js/auto";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const shortMonth = (date) =>
  date.toLocaleString("en-IN", { month: "short", year: "2-digit" });

// Get billing cycle start for a given reference date and billingDate day
const getCycleStart = (billingDay, referenceDate = new Date()) => {
  const d = new Date(referenceDate);
  const start = new Date(d.getFullYear(), d.getMonth(), billingDay);
  if (d.getDate() < billingDay) start.setMonth(start.getMonth() - 1);
  return start;
};

const getDaysUntil = (dayOfMonth) => {
  if (!dayOfMonth) return null;
  const today = new Date();
  const d = Number(dayOfMonth);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), d);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, d);
  const target = today.getDate() <= d ? thisMonth : nextMonth;
  return Math.ceil((target - today) / 86400000);
};

const utilLevel = (spend, limit) => {
  if (!limit) return "unknown";
  const r = spend / limit;
  if (r >= 0.9) return "critical";
  if (r >= 0.7) return "warning";
  if (r >= 0.4) return "moderate";
  return "safe";
};

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
const T = {
  bg: "linear-gradient(135deg,#F0F4FF 0%,#FAF5FF 100%)",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  indigo: "#6366F1",
  indigoBg: "#EEF2FF",
  green: "#22C55E",
  greenBg: "#F0FDF4",
  greenBorder: "#86EFAC",
  yellow: "#F59E0B",
  yellowBg: "#FFFBEB",
  yellowBorder: "#FCD34D",
  red: "#EF4444",
  redBg: "#FFF1F2",
  redBorder: "#FECDD3",
  orange: "#F97316",
  orangeBg: "#FFF7ED",
  shadowSm: "0 2px 12px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 24px rgba(99,102,241,0.12)",
};

const CARD_PALETTES = [
  ["#1a1a2e", "#16213e", "#0f3460"],
  ["#0f3460", "#533483", "#7B2D8B"],
  ["#1B4332", "#2D6A4F", "#40916C"],
  ["#7B2D8B", "#C2185B", "#E91E8C"],
  ["#1565C0", "#0097A7", "#00BCD4"],
  ["#B5451B", "#E8871E", "#F59E0B"],
];

const CAT_COLORS = [
  "#6366F1", "#F59E0B", "#22C55E", "#EF4444",
  "#0EA5E9", "#EC4899", "#10B981", "#8B5CF6",
];

// ─────────────────────────────────────────────
// UTILIZATION RING (SVG)
// ─────────────────────────────────────────────
function UtilRing({ pct, level, size = 90 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - Math.min(pct, 100) / 100);
  const color = level === "critical" ? T.red
    : level === "warning" ? T.yellow
    : level === "moderate" ? T.orange
    : T.green;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#F1F5F9" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="50%" y="54%"
        textAnchor="middle"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "center",
          fontSize: size < 80 ? 13 : 16,
          fontWeight: 800,
          fill: color,
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// VISUAL CARD FACE
// ─────────────────────────────────────────────
function CardFace({ card, spend, paletteIndex }) {
  const [c1, c2, c3] = CARD_PALETTES[paletteIndex % CARD_PALETTES.length];
  const daysLeft = getDaysUntil(card.dueDate);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "1.586",
      borderRadius: 20,
      overflow: "hidden",
      background: card.cardImageUrl
        ? `url(${card.cardImageUrl}) center/cover`
        : `linear-gradient(135deg,${c1},${c2},${c3})`,
      boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
      color: "#fff",
      userSelect: "none",
    }}>
      {/* Overlay for custom image */}
      {card.cardImageUrl && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg,rgba(0,0,0,0.6),rgba(0,0,0,0.3))"
        }} />
      )}

      {/* Decorative circles */}
      {!card.cardImageUrl && (
        <>
          <div style={{
            position: "absolute", width: 220, height: 220, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)", top: -70, right: -50,
          }} />
          <div style={{
            position: "absolute", width: 160, height: 160, borderRadius: "50%",
            background: "rgba(255,255,255,0.04)", bottom: -60, left: 10,
          }} />
        </>
      )}

      <div style={{
        position: "relative", zIndex: 2,
        padding: "16px 20px", height: "100%",
        boxSizing: "border-box",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Top */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {card.bank || "Bank"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 1 }}>{card.cardName}</div>
          </div>
          {/* EMV Chip */}
          <div style={{
            width: 34, height: 26, borderRadius: 5,
            background: "linear-gradient(135deg,#FFD700,#DAA520)",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr", gap: 1, padding: 3, boxSizing: "border-box",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 1 }} />
            ))}
          </div>
        </div>

        {/* Masked number */}
        <div style={{
          display: "flex", gap: 12, fontSize: 15,
          letterSpacing: "0.2em", opacity: 0.75,
          fontFamily: "'Courier New', monospace",
        }}>
          <span>••••</span><span>••••</span><span>••••</span>
          <span style={{ opacity: 0.5, fontSize: 11 }}>XXXX</span>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 9, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Current Bill
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(spend)}</div>
            {card.limit && (
              <div style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>
                of {fmt(card.limit)} limit
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
                fontSize: 11, fontWeight: 700, marginBottom: 4,
              }}>
                {daysLeft <= 0 ? "⚠️ Due Today!" : `Due in ${daysLeft}d`}
              </div>
            )}
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>
              {card.network || ""}
            </div>
          </div>
        </div>
      </div>

      {/* Utilization bar at bottom edge */}
      {card.limit && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: "rgba(255,255,255,0.15)" }}>
          <div style={{
            height: 5,
            width: `${Math.min((spend / Number(card.limit)) * 100, 100)}%`,
            background: utilLevel(spend, Number(card.limit)) === "critical" ? T.red
              : utilLevel(spend, Number(card.limit)) === "warning" ? T.yellow : T.green,
            transition: "width 0.8s ease",
          }} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAYMENT STATUS BADGE
// ─────────────────────────────────────────────
function PaymentBadge({ daysUntilDue, spend }) {
  if (spend === 0) return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: T.greenBg, border: `1px solid ${T.greenBorder}`,
      borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: "#16A34A",
    }}>
      ✅ No dues this cycle
    </div>
  );

  if (daysUntilDue === null) return null;

  if (daysUntilDue <= 0) return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: T.redBg, border: `1px solid ${T.redBorder}`,
      borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: T.red,
    }}>
      🚨 <div>
        <div>Payment Due TODAY!</div>
        <div style={{ fontSize: 11, fontWeight: 500, marginTop: 1 }}>Pay {fmt(spend)} immediately to avoid interest.</div>
      </div>
    </div>
  );

  if (daysUntilDue <= 3) return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: T.redBg, border: `1px solid ${T.redBorder}`,
      borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: T.red,
    }}>
      🔴 <div>
        <div>Pay within {daysUntilDue} day{daysUntilDue > 1 ? "s" : ""}!</div>
        <div style={{ fontSize: 11, fontWeight: 500, marginTop: 1 }}>Amount due: {fmt(spend)}</div>
      </div>
    </div>
  );

  if (daysUntilDue <= 7) return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: T.yellowBg, border: `1px solid ${T.yellowBorder}`,
      borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "#92400E",
    }}>
      ⚠️ <div>
        <div>Payment due in {daysUntilDue} days</div>
        <div style={{ fontSize: 11, fontWeight: 500, marginTop: 1 }}>Plan to pay {fmt(spend)} by {ordinal(Number(new Date().getDate() + daysUntilDue))}.</div>
      </div>
    </div>
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: T.greenBg, border: `1px solid ${T.greenBorder}`,
      borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "#16A34A",
    }}>
      ✅ <div>
        <div>Payment due in {daysUntilDue} days</div>
        <div style={{ fontSize: 11, fontWeight: 500, marginTop: 1 }}>Amount: {fmt(spend)}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────
const SecHeader = ({ icon, title, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10,
      background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
    }}>{icon}</div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: T.sub }}>{sub}</div>}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// PANEL WRAPPER
// ─────────────────────────────────────────────
const Panel = ({ children, style = {} }) => (
  <div style={{
    background: T.card, borderRadius: 18,
    padding: "18px 18px 16px",
    boxShadow: T.shadowSm,
    ...style,
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function CardDashboard() {

  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");

  useEffect(() => {
    Promise.all([loadCards(), loadTransactions()])
      .finally(() => setLoading(false));
  }, []);

  const loadCards = async () => {
    const snap = await getDocs(collection(db, "creditCards"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setCards(list);
    if (list.length > 0) setSelectedCard(list[0]);
  };

  const loadTransactions = async () => {
    const snap = await getDocs(collection(db, "transactions"));
    setTransactions(snap.docs.map((d) => d.data()));
  };

  // ── Billing cycle calc ──
  const getCycleData = (card, cyclesBack = 0) => {
    const billingDay = Number(card.billingDate);
    const now = new Date();
    // Go back N months
    const ref = new Date(now.getFullYear(), now.getMonth() - cyclesBack, now.getDate());
    const start = getCycleStart(billingDay, ref);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    let spend = 0;
    const categorySpend = {};
    const merchantSpend = {};
    const dailySpend = {};

    transactions.forEach((t) => {
      if (t.cardName !== card.cardName) return;
      const d = new Date(t.date);
      if (d >= start && d < end) {
        const amt = Number(t.amount || 0);
        spend += amt;

        const cat = t.category || "Other";
        categorySpend[cat] = (categorySpend[cat] || 0) + amt;

        const mer = t.merchant || t.recipientName || "Other";
        merchantSpend[mer] = (merchantSpend[mer] || 0) + amt;

        const dayKey = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        dailySpend[dayKey] = (dailySpend[dayKey] || 0) + amt;
      }
    });

    return { spend, categorySpend, merchantSpend, dailySpend, start, end };
  };

  // ── Last 6 cycles trend for selected card ──
  const trendData = useMemo(() => {
    if (!selectedCard) return null;
    const cycles = [];
    for (let i = 5; i >= 0; i--) {
      const { spend, start } = getCycleData(selectedCard, i);
      cycles.push({ label: shortMonth(start), spend });
    }
    return cycles;
  }, [selectedCard, transactions]); // eslint-disable-line

  // ── Current cycle full data ──
  const currentCycle = useMemo(() => {
    if (!selectedCard) return null;
    return getCycleData(selectedCard, 0);
  }, [selectedCard, transactions]); // eslint-disable-line

  // ── All cards summary ──
  const cardsSummary = useMemo(() => {
    return cards.map((card) => {
      const { spend } = getCycleData(card, 0);
      const limit = Number(card.limit || 0);
      const daysUntilDue = getDaysUntil(card.dueDate);
      const level = utilLevel(spend, limit);
      return { card, spend, limit, daysUntilDue, level };
    }).sort((a, b) => {
      // Sort: overdue first → by urgency → by spend
      const urgency = (x) => {
        if (x.daysUntilDue !== null && x.daysUntilDue <= 3) return 0;
        if (x.level === "critical") return 1;
        if (x.daysUntilDue !== null && x.daysUntilDue <= 7) return 2;
        if (x.level === "warning") return 3;
        return 4;
      };
      return urgency(a) - urgency(b) || b.spend - a.spend;
    });
  }, [cards, transactions]); // eslint-disable-line

  const totalSpendAllCards = cardsSummary.reduce((s, c) => s + c.spend, 0);
  const totalLimitAllCards = cardsSummary.reduce((s, c) => s + c.limit, 0);
  const urgentCards = cardsSummary.filter((c) => c.daysUntilDue !== null && c.daysUntilDue <= 7 && c.spend > 0);

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", fontSize: 28, background: T.bg
    }}>⏳</div>
  );

  if (cards.length === 0) return (
    <div style={{
      background: T.bg, minHeight: "100vh", padding: 24,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',-apple-system,sans-serif"
    }}>
      <div style={{
        background: T.card, borderRadius: 20, padding: "48px 32px",
        textAlign: "center", maxWidth: 360
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>💳</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
          No cards found
        </div>
        <div style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>
          Add your credit cards in Firestore collection <b>"creditCards"</b> to
          begin tracking.
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // MAIN UI
  // ─────────────────────────────────────────────
  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        padding: "16px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Summary Overview ── */}
      <Panel style={{ marginBottom: 20 }}>
        <SecHeader
          icon="📊"
          title="Credit Overview"
          sub="Summary across all cards"
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: T.sub }}>Total Spend (this cycle)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>
              {fmt(totalSpendAllCards)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub }}>Total Card Limit</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>
              {fmt(totalLimitAllCards)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub }}>Utilization</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>
              {totalLimitAllCards
                ? ((totalSpendAllCards / totalLimitAllCards) * 100).toFixed(1) + "%"
                : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub }}>Urgent Payments</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.red }}>
              {urgentCards.length}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Cards Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {cardsSummary.map((c, i) => (
          <div
            key={c.card.id}
            onClick={() => setSelectedCard(c.card)}
            style={{
              cursor: "pointer",
              transform:
                selectedCard && selectedCard.id === c.card.id
                  ? "scale(1.02)"
                  : "scale(1)",
              transition: "transform 0.3s",
            }}
          >
            <CardFace
              card={c.card}
              spend={c.spend}
              paletteIndex={i}
            />
          </div>
        ))}
      </div>

      {/* ── Selected Card Details ── */}
      {selectedCard && (
        <>
          <Panel style={{ marginBottom: 24 }}>
            <SecHeader
              icon="💡"
              title={`Insights — ${selectedCard.cardName}`}
            />
            <PaymentBadge
              daysUntilDue={getDaysUntil(selectedCard.dueDate)}
              spend={currentCycle?.spend || 0}
            />
          </Panel>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {["overview", "categories", "merchants", "trend", "daily"].map((t) => (
              <div
                key={t}
                onClick={() => setDetailTab(t)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  background:
                    detailTab === t ? T.indigoBg : "transparent",
                  color: detailTab === t ? T.indigo : T.sub,
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            ))}
          </div>

          {/* Tab Content */}
          {detailTab === "overview" && (
            <Panel>
              <SecHeader icon="📈" title="Cycle Summary" />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <UtilRing
                  pct={Math.round(
                    (currentCycle.spend / (selectedCard.limit || 1)) * 100
                  )}
                  level={utilLevel(
                    currentCycle.spend,
                    selectedCard.limit
                  )}
                />
                <div>
                  <div
                    style={{ fontSize: 14, color: T.text, fontWeight: 700 }}
                  >
                    Billing period
                  </div>
                  <div style={{ fontSize: 13, color: T.sub }}>
                    {currentCycle.start.toDateString()} –{" "}
                    {currentCycle.end.toDateString()}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      color: T.text,
                      fontWeight: 700,
                    }}
                  >
                    Current spend: {fmt(currentCycle.spend)}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* More detail tabs can be implemented here (categories, merchants, etc.) */}
        </>
      )}
    </div>
  );
}
