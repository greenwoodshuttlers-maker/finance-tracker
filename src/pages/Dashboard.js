// Dashboard.jsx
// Modern Finance Dashboard — INDMoney-style
// Features: Card billing cycle warnings, spend insights, category breakdown, color alerts

import { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const currencyFmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getDaysUntilDue = (billingDueDay) => {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), billingDueDay);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, billingDueDay);
  const target = today.getDate() <= billingDueDay ? thisMonth : nextMonth;
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const getSpendLevel = (spend, limit) => {
  if (!limit) return "normal";
  const ratio = spend / limit;
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.7) return "warning";
  return "safe";
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
  indigoDark: "#4F46E5",
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

const CARD_COLORS = [
  ["#6366F1", "#8B5CF6"],
  ["#0EA5E9", "#6366F1"],
  ["#10B981", "#0EA5E9"],
  ["#F59E0B", "#EF4444"],
  ["#EC4899", "#8B5CF6"],
];

// ─────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────

const SectionTitle = ({ icon, title, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
    <div style={{
      width: 38, height: 38, borderRadius: 12,
      background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
    }}>{icon}</div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: T.sub }}>{sub}</div>}
    </div>
  </div>
);

const StatCard = ({ icon, label, value, sub, accent = T.indigo, bg = "#F0F4FF" }) => (
  <div style={{
    background: T.card, borderRadius: 18, padding: "18px 20px",
    boxShadow: T.shadowSm, display: "flex", alignItems: "center", gap: 16,
    flex: "1 1 160px", minWidth: 140,
  }}>
    <div style={{
      width: 46, height: 46, borderRadius: 14,
      background: bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 22, flexShrink: 0
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 12, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

// Billing warning badge
const DueBadge = ({ days }) => {
  if (days <= 3) return (
    <span style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      🚨 Due in {days}d
    </span>
  );
  if (days <= 7) return (
    <span style={{ background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellowBorder}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      ⚠️ Due in {days}d
    </span>
  );
  return (
    <span style={{ background: T.greenBg, color: "#16A34A", border: `1px solid ${T.greenBorder}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      ✅ Due in {days}d
    </span>
  );
};

// Spend level color bar
const SpendBar = ({ spend, limit }) => {
  const pct = limit ? Math.min((spend / limit) * 100, 100) : null;
  const level = getSpendLevel(spend, limit);
  const barColor = level === "critical" ? T.red : level === "warning" ? T.yellow : T.green;

  if (!limit) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.sub, marginBottom: 4 }}>
        <span>{currencyFmt(spend)} spent</span>
        <span>{pct.toFixed(0)}% of {currencyFmt(limit)}</span>
      </div>
      <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999 }}>
        <div style={{ height: 6, width: `${pct}%`, borderRadius: 999, background: barColor, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function Dashboard() {

  const [monthlySpend, setMonthlySpend] = useState(0);
  const [lastMonthSpend, setLastMonthSpend] = useState(0);
  const [categoryData, setCategoryData] = useState({});
  const [cards, setCards] = useState([]);       // full card docs with metadata
  const [cardSpend, setCardSpend] = useState({}); // { cardName: currentCycleSpend }
  const [topMerchants, setTopMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadMonthly(), loadCards(), loadMerchants()])
      .finally(() => setLoading(false));
  }, []);

  // ── Monthly + Category ──
  const loadMonthly = async () => {
    const now = new Date();
    const mk = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
    const thisKey = mk(now.getFullYear(), now.getMonth() + 1);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = mk(prevDate.getFullYear(), prevDate.getMonth() + 1);

    const [thisSnap, lastSnap, catSnap] = await Promise.all([
      getDoc(doc(db, "monthlySummary", thisKey)),
      getDoc(doc(db, "monthlySummary", lastKey)),
      getDoc(doc(db, "categorySummary", thisKey)),
    ]);

    if (thisSnap.exists()) setMonthlySpend(thisSnap.data().totalSpend || 0);
    if (lastSnap.exists()) setLastMonthSpend(lastSnap.data().totalSpend || 0);
    if (catSnap.exists()) setCategoryData(catSnap.data());
  };

  // ── Credit Cards (with metadata from creditCards collection) ──
  const loadCards = async () => {
    const [cardsSnap, summarySnap] = await Promise.all([
      getDocs(collection(db, "creditCards")),
      getDocs(collection(db, "cardSummary")),
    ]);

    // Build spend map
    const spendMap = {};
    summarySnap.docs.forEach((d) => {
      spendMap[d.id] = d.data().currentCycleSpend || 0;
    });

    // Merge card metadata with spend
    const cardList = cardsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      currentSpend: spendMap[d.data().cardName] || spendMap[d.id] || 0,
    }));

    setCards(cardList);
    setCardSpend(spendMap);
  };

  // ── Top Merchants ──
  const loadMerchants = async () => {
    const now = new Date();
    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const snap = await getDoc(doc(db, "merchantSummary", mk));
      if (snap.exists()) {
        const data = snap.data();
        const sorted = Object.entries(data)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        setTopMerchants(sorted);
      }
    } catch {
      // merchantSummary may not exist yet
    }
  };

  // ── Derived Stats ──
  const spendDelta = lastMonthSpend > 0
    ? (((monthlySpend - lastMonthSpend) / lastMonthSpend) * 100).toFixed(1)
    : null;

  const totalCardSpend = Object.values(cardSpend).reduce((a, b) => a + b, 0);
  const topCategory = Object.entries(categoryData).sort((a, b) => b[1] - a[1])[0];

  // ── Category chart ──
  const categoryColors = [
    "#6366F1", "#8B5CF6", "#0EA5E9", "#22C55E",
    "#F59E0B", "#EF4444", "#EC4899", "#10B981"
  ];

  const doughnutData = {
    labels: Object.keys(categoryData),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: categoryColors,
      borderWidth: 2,
      borderColor: "#fff",
    }]
  };

  const barData = {
    labels: Object.keys(categoryData),
    datasets: [{
      label: "Spend (₹)",
      data: Object.values(categoryData),
      backgroundColor: categoryColors,
      borderRadius: 8,
      borderSkipped: false,
    }]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString("en-IN")}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: "#F1F5F9" },
        ticks: {
          callback: (v) => "₹" + Number(v).toLocaleString("en-IN"),
          font: { size: 11 }
        }
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { padding: 14, font: { size: 12 }, boxWidth: 12, borderRadius: 4 }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString("en-IN")}`
        }
      }
    }
  };

  // ── Loading skeleton ──
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontSize: 28 }}>
      ⏳
    </div>
  );

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
      <div style={{ maxWidth: 860, margin: "auto" }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>
              💰 My Finance
            </h1>
            <p style={{ color: T.sub, margin: "4px 0 0", fontSize: 14 }}>
              {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })} overview
            </p>
          </div>
          <div style={{
            background: "#EEF2FF", color: T.indigo, borderRadius: 12,
            padding: "8px 16px", fontWeight: 700, fontSize: 13
          }}>
            🗓️ {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </div>
        </div>


        {/* ══ TOP STAT CARDS ══ */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>

          <StatCard
            icon="📊"
            label="This Month"
            value={currencyFmt(monthlySpend)}
            sub={spendDelta !== null
              ? `${spendDelta > 0 ? "▲" : "▼"} ${Math.abs(spendDelta)}% vs last month`
              : "No previous data"}
            bg={spendDelta > 10 ? T.redBg : "#EEF2FF"}
          />

          <StatCard
            icon="💳"
            label="Card Spend"
            value={currencyFmt(totalCardSpend)}
            sub={`Across ${cards.length} card${cards.length !== 1 ? "s" : ""}`}
            bg="#F5F3FF"
          />

          {topCategory && (
            <StatCard
              icon="🔥"
              label="Top Category"
              value={topCategory[0]}
              sub={currencyFmt(topCategory[1])}
              bg="#FFF7ED"
            />
          )}

        </div>


        {/* ══ CREDIT CARD SECTION ══ */}
        {cards.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionTitle icon="💳" title="Credit Cards" sub="Billing cycle tracking & spend alerts" />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {cards.map((card, idx) => {
                const colors = CARD_COLORS[idx % CARD_COLORS.length];
                const spend = card.currentSpend || 0;
                const limit = card.creditLimit || null;
                const dueDay = card.billingDueDay || card.dueDate || null;
                const daysLeft = dueDay ? getDaysUntilDue(Number(dueDay)) : null;
                const level = getSpendLevel(spend, limit);

                const alertBg = level === "critical" ? T.redBg
                  : level === "warning" ? T.yellowBg
                  : T.card;
                const alertBorder = level === "critical" ? T.redBorder
                  : level === "warning" ? T.yellowBorder
                  : T.border;

                return (
                  <div key={card.id} style={{
                    background: alertBg,
                    border: `1.5px solid ${alertBorder}`,
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: T.shadowSm,
                  }}>

                    {/* Card color strip header */}
                    <div style={{
                      background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Credit Card
                        </div>
                        <div style={{ color: "#fff", fontSize: 17, fontWeight: 800, marginTop: 2 }}>
                          {card.cardName || card.id}
                        </div>
                        {card.bankName && (
                          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
                            {card.bankName}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Current Cycle</div>
                        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>
                          {currencyFmt(spend)}
                        </div>
                      </div>
                    </div>

                    {/* Card detail body */}
                    <div style={{ padding: "14px 20px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>

                        {/* Due date badge */}
                        {daysLeft !== null && <DueBadge days={daysLeft} />}

                        {/* Spend level alert */}
                        {level === "critical" && (
                          <span style={{ color: T.red, fontWeight: 700, fontSize: 13 }}>
                            🚨 Near credit limit!
                          </span>
                        )}
                        {level === "warning" && (
                          <span style={{ color: T.yellow, fontWeight: 700, fontSize: 13 }}>
                            ⚠️ High spend this cycle
                          </span>
                        )}
                        {level === "safe" && (
                          <span style={{ color: "#16A34A", fontWeight: 600, fontSize: 13 }}>
                            ✅ Spend looks good
                          </span>
                        )}

                        {/* Credit limit */}
                        {limit && (
                          <span style={{ color: T.sub, fontSize: 13 }}>
                            Limit: {currencyFmt(limit)}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <SpendBar spend={spend} limit={limit} />
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* ══ CHARTS ROW ══ */}
        {Object.keys(categoryData).length > 0 && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>

            {/* Bar chart */}
            <div style={{
              flex: "2 1 320px", background: T.card, borderRadius: 20,
              padding: "20px 20px 16px", boxShadow: T.shadowSm
            }}>
              <SectionTitle icon="📊" title="Category Breakdown" sub="This month's spend by category" />
              <Bar data={barData} options={barOptions} />
            </div>

            {/* Doughnut chart */}
            <div style={{
              flex: "1 1 220px", background: T.card, borderRadius: 20,
              padding: "20px 20px 16px", boxShadow: T.shadowSm,
              display: "flex", flexDirection: "column"
            }}>
              <SectionTitle icon="🥧" title="Share" sub="Category split" />
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>

          </div>
        )}


        {/* ══ TOP MERCHANTS ══ */}
        {topMerchants.length > 0 && (
          <div style={{
            background: T.card, borderRadius: 20,
            padding: "20px 20px 10px", boxShadow: T.shadowSm, marginBottom: 24
          }}>
            <SectionTitle icon="🏪" title="Top Merchants" sub="Where you spent the most this month" />
            {topMerchants.map(([name, amount], i) => {
              const maxVal = topMerchants[0][1];
              const pct = (amount / maxVal) * 100;
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `${categoryColors[i % categoryColors.length]}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: categoryColors[i % categoryColors.length]
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{name}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.indigo }}>{currencyFmt(amount)}</span>
                    </div>
                    <div style={{ height: 5, background: "#F1F5F9", borderRadius: 999 }}>
                      <div style={{
                        height: 5, width: `${pct}%`, borderRadius: 999,
                        background: categoryColors[i % categoryColors.length],
                        transition: "width 0.5s ease"
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* ══ MONTH COMPARISON ══ */}
        {lastMonthSpend > 0 && (
          <div style={{
            background: T.card, borderRadius: 20,
            padding: "20px", boxShadow: T.shadowSm, marginBottom: 24
          }}>
            <SectionTitle icon="📅" title="Month Comparison" sub="This month vs last month" />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

              {[
                { label: "Last Month", value: lastMonthSpend, color: T.sub },
                { label: "This Month", value: monthlySpend, color: monthlySpend > lastMonthSpend ? T.red : T.green },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  flex: 1, background: "#F8FAFC", borderRadius: 14,
                  padding: "16px 20px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 12, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 6 }}>
                    {currencyFmt(value)}
                  </div>
                </div>
              ))}

              <div style={{
                flex: "0 0 100%", background: spendDelta > 0 ? T.redBg : T.greenBg,
                borderRadius: 14, padding: "12px 20px", textAlign: "center",
                border: `1px solid ${spendDelta > 0 ? T.redBorder : T.greenBorder}`
              }}>
                <span style={{
                  fontWeight: 700, fontSize: 15,
                  color: spendDelta > 0 ? T.red : "#16A34A"
                }}>
                  {spendDelta > 0
                    ? `▲ ${spendDelta}% more than last month`
                    : `▼ ${Math.abs(spendDelta)}% less than last month`}
                </span>
              </div>

            </div>
          </div>
        )}


        {/* ══ EMPTY STATE ══ */}
        {Object.keys(categoryData).length === 0 && cards.length === 0 && (
          <div style={{
            background: T.card, borderRadius: 20, padding: "48px 24px",
            textAlign: "center", boxShadow: T.shadowSm
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>No transactions yet</div>
            <div style={{ fontSize: 14, color: T.sub, marginTop: 6 }}>
              Add your first transaction to see your dashboard come alive.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
