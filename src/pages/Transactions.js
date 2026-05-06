// ------------------------------------------------------
// TRANSACTIONS PAGE — Modern Mobile-First UI
// Features:
//   - Mobile-first card layout (table on desktop)
//   - Multi-select checkbox filters per column
//   - Image lightbox with pinch/scroll zoom
//   - Date range filter
//   - Smart summary bar (total, count, top category)
//   - Export to Excel & PDF
//   - Sort by any column
//   - Pull-to-refresh friendly load state
// ------------------------------------------------------

import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const currencyFmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const dateFmt = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
};

// Get unique non-empty values for a column
const uniqueVals = (data, key) => {
  const s = new Set(data.map((t) => String(t[key] || "")).filter(Boolean));
  return [...s].sort();
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
  indigoBg: "#EEF2FF",
  green: "#22C55E",
  greenBg: "#F0FDF4",
  red: "#EF4444",
  redBg: "#FFF1F2",
  yellow: "#F59E0B",
  yellowBg: "#FFFBEB",
  shadow: "0 4px 24px rgba(99,102,241,0.10)",
  shadowSm: "0 2px 12px rgba(0,0,0,0.06)",
};

// Category color map
const CAT_COLORS = {
  Food: ["#FEF3C7", "#D97706"],
  Groceries: ["#DCFCE7", "#16A34A"],
  Transport: ["#DBEAFE", "#1D4ED8"],
  Bills: ["#FEE2E2", "#DC2626"],
  Shopping: ["#F3E8FF", "#7C3AED"],
  Health: ["#ECFDF5", "#059669"],
  Entertainment: ["#FFF1F2", "#E11D48"],
  Investment: ["#F0FDF4", "#15803D"],
};
const getCatStyle = (cat) => CAT_COLORS[cat] || ["#F1F5F9", "#475569"];

// Transaction type icons
const TYPE_ICON = {
  UPI: "📲",
  "Credit Card": "💳",
  "Debit Card": "🏧",
  Cash: "💵",
};

// ─────────────────────────────────────────────
// IMAGE LIGHTBOX COMPONENT
// ─────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef();

  // Reset zoom/pos when switching images
  useEffect(() => { setZoom(1); setPos({ x: 0, y: 0 }); }, [current]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.002, 0.5), 5));
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  // Touch zoom (pinch)
  const lastDist = useRef(null);
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current) {
        const delta = dist - lastDist.current;
        setZoom((z) => Math.min(Math.max(z + delta * 0.01, 0.5), 5));
      }
      lastDist.current = dist;
    }
  };
  const handleTouchEnd = () => { lastDist.current = null; };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Top bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
          zIndex: 2,
        }}
      >
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
          {current + 1} / {images.length}
        </span>

        <div style={{ display: "flex", gap: 10 }}>
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
            style={lbBtnStyle}
          >−</button>
          <span style={{ color: "#fff", fontSize: 13, lineHeight: "34px", minWidth: 40, textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.5, 5))}
            style={lbBtnStyle}
          >+</button>
          <button
            onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }); }}
            style={lbBtnStyle}
          >↺</button>
          <a
            href={images[current]}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ ...lbBtnStyle, textDecoration: "none", lineHeight: "34px" }}
          >⬆</a>
          <button onClick={onClose} style={{ ...lbBtnStyle, background: "#EF4444" }}>✕</button>
        </div>
      </div>

      {/* Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          overflow: "hidden",
          width: "100vw", height: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
        }}
      >
        <img
          ref={imgRef}
          src={images[current]}
          alt=""
          style={{
            maxWidth: "90vw", maxHeight: "80vh",
            transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.15s ease",
            borderRadius: 12,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => Math.max(c - 1, 0)); }}
            style={{
              ...lbBtnStyle,
              position: "absolute", left: 16, top: "50%",
              transform: "translateY(-50%)", fontSize: 20, width: 44, height: 44,
              display: current === 0 ? "none" : "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => Math.min(c + 1, images.length - 1)); }}
            style={{
              ...lbBtnStyle,
              position: "absolute", right: 16, top: "50%",
              transform: "translateY(-50%)", fontSize: 20, width: 44, height: 44,
              display: current === images.length - 1 ? "none" : "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >›</button>
        </>
      )}

      {/* Bottom hint */}
      <div style={{
        position: "absolute", bottom: 20,
        color: "rgba(255,255,255,0.4)", fontSize: 12
      }}>
        Scroll to zoom · Drag to pan · Pinch on mobile
      </div>
    </div>
  );
}

const lbBtnStyle = {
  background: "rgba(255,255,255,0.15)",
  border: "none", borderRadius: 8,
  color: "#fff", padding: "6px 12px",
  cursor: "pointer", fontSize: 14, fontWeight: 600,
};

// ─────────────────────────────────────────────
// MULTI-SELECT FILTER DROPDOWN
// ─────────────────────────────────────────────
function MultiFilterDropdown({ column, options, selected, onChange, onClose }) {
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute", top: "100%", left: 0, zIndex: 100,
        background: "#fff", borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        border: `1.5px solid ${T.border}`,
        minWidth: 200, maxWidth: 260,
        maxHeight: 260, overflowY: "auto",
        padding: "8px 0",
      }}
    >
      {/* Select all / clear */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        padding: "6px 14px 10px",
        borderBottom: `1px solid ${T.border}`
      }}>
        <button
          onClick={() => onChange(options)}
          style={{ ...smallBtnStyle, color: T.indigo }}
        >All</button>
        <button
          onClick={() => onChange([])}
          style={{ ...smallBtnStyle, color: T.red }}
        >Clear</button>
      </div>

      {options.length === 0 && (
        <div style={{ padding: "10px 14px", fontSize: 13, color: T.sub }}>No options</div>
      )}

      {options.map((opt) => (
        <label
          key={opt}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 14px", cursor: "pointer",
            background: selected.includes(opt) ? T.indigoBg : "transparent",
            fontSize: 13, color: T.text,
          }}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            style={{ accentColor: T.indigo, width: 15, height: 15 }}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

const smallBtnStyle = {
  background: "none", border: "none",
  fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0,
};

// ─────────────────────────────────────────────
// TRANSACTION CARD (mobile view)
// ─────────────────────────────────────────────
function TxnCard({ t, onImageClick }) {
  const [catBg, catColor] = getCatStyle(t.category);

  return (
    <div style={{
      background: T.card, borderRadius: 16,
      padding: "14px 16px", marginBottom: 10,
      boxShadow: T.shadowSm,
      border: `1px solid ${T.border}`,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>
            {t.merchant || t.recipientName || "Transaction"}
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
            {dateFmt(t.date)} · {TYPE_ICON[t.transactionType] || "💸"} {t.transactionType || "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.red }}>
            -{currencyFmt(t.amount)}
          </div>
          {t.cardName && (
            <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{t.cardName}</div>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {t.category && (
          <span style={{
            background: catBg, color: catColor,
            borderRadius: 8, padding: "3px 10px",
            fontSize: 12, fontWeight: 600
          }}>
            {t.category}
          </span>
        )}
        {t.upiApp && (
          <span style={{
            background: "#F0FDF4", color: "#16A34A",
            borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 500
          }}>
            {t.upiApp}
          </span>
        )}
        {t.txnNo && (
          <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace" }}>
            {t.txnNo}
          </span>
        )}
      </div>

      {/* Notes */}
      {t.notes && (
        <div style={{
          marginTop: 8, fontSize: 12, color: T.sub,
          background: "#F8FAFC", borderRadius: 8, padding: "6px 10px"
        }}>
          📝 {t.notes}
        </div>
      )}

      {/* Attachments */}
      {t.attachments?.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {t.attachments.map((url, idx) => (
            <div
              key={idx}
              onClick={() => onImageClick(t.attachments, idx)}
              style={{
                position: "relative", cursor: "pointer",
                borderRadius: 10, overflow: "hidden",
                border: `2px solid ${T.border}`,
              }}
            >
              <img
                src={url} alt=""
                style={{ width: 60, height: 60, objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.3)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0)"}
              >
                <span style={{ color: "#fff", fontSize: 18, opacity: 0 }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                >🔍</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SORT ICON
// ─────────────────────────────────────────────
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
  return <span style={{ marginLeft: 4, color: T.indigo }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Transactions() {

  // ── Data ──
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Date range ──
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ── Multi-select filters: { column: [selectedValues] } ──
  const [multiFilters, setMultiFilters] = useState({});

  // ── Open dropdown tracker ──
  const [openDropdown, setOpenDropdown] = useState(null);

  // ── Text search (global) ──
  const [searchText, setSearchText] = useState("");

  // ── Sort ──
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // ── View mode ──
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  // ── Lightbox ──
  const [lightbox, setLightbox] = useState(null); // { images, index }

  // ── Filter panel open (mobile) ──
  const [filterOpen, setFilterOpen] = useState(false);

  // ─────────────────────────────────────────────
  // FILTERABLE COLUMNS
  // ─────────────────────────────────────────────
  const filterColumns = [
    { key: "category", label: "Category" },
    { key: "transactionType", label: "Type" },
    { key: "cardName", label: "Card" },
    { key: "merchant", label: "Merchant" },
    { key: "upiApp", label: "UPI App" },
  ];

  // ─────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "transactions"));
      const d = snap.docs.map((doc) => doc.data());
      d.sort((a, b) => new Date(b.date) - new Date(a.date));
      setData(d);
      setFiltered(d);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // APPLY ALL FILTERS
  // ─────────────────────────────────────────────
  const applyFilters = useCallback((
    mFilters = multiFilters,
    from = fromDate,
    to = toDate,
    search = searchText,
    sCol = sortCol,
    sDir = sortDir
  ) => {
    let temp = [...data];

    // Multi-select column filters
    Object.entries(mFilters).forEach(([key, vals]) => {
      if (vals && vals.length > 0) {
        temp = temp.filter((t) => vals.includes(String(t[key] || "")));
      }
    });

    // Date range
    if (from) temp = temp.filter((t) => new Date(t.date) >= new Date(from));
    if (to) temp = temp.filter((t) => new Date(t.date) <= new Date(to));

    // Global search
    if (search.trim()) {
      const q = search.toLowerCase();
      temp = temp.filter((t) =>
        Object.values(t).some((v) => String(v || "").toLowerCase().includes(q))
      );
    }

    // Sort
    temp.sort((a, b) => {
      let va = a[sCol] ?? "";
      let vb = b[sCol] ?? "";
      if (sCol === "amount") { va = Number(va); vb = Number(vb); }
      if (sCol === "date") { va = new Date(va); vb = new Date(vb); }
      if (va < vb) return sDir === "asc" ? -1 : 1;
      if (va > vb) return sDir === "asc" ? 1 : -1;
      return 0;
    });

    setFiltered(temp);
  }, [data, multiFilters, fromDate, toDate, searchText, sortCol, sortDir]);

  // Re-apply when data loads
  useEffect(() => {
    if (data.length > 0) applyFilters();
  }, [data]); // eslint-disable-line

  // ─────────────────────────────────────────────
  // FILTER HANDLERS
  // ─────────────────────────────────────────────
  const handleMultiFilter = (col, vals) => {
    const next = { ...multiFilters, [col]: vals };
    setMultiFilters(next);
    applyFilters(next, fromDate, toDate, searchText);
  };

  const handleDateFrom = (v) => {
    setFromDate(v);
    applyFilters(multiFilters, v, toDate, searchText);
  };

  const handleDateTo = (v) => {
    setToDate(v);
    applyFilters(multiFilters, fromDate, v, searchText);
  };

  const handleSearch = (v) => {
    setSearchText(v);
    applyFilters(multiFilters, fromDate, toDate, v);
  };

  const handleSort = (col) => {
    const dir = sortCol === col && sortDir === "asc" ? "desc" : "asc";
    setSortCol(col);
    setSortDir(dir);
    applyFilters(multiFilters, fromDate, toDate, searchText, col, dir);
  };

  const clearAllFilters = () => {
    setMultiFilters({});
    setFromDate("");
    setToDate("");
    setSearchText("");
    setSortCol("date");
    setSortDir("desc");
    setFiltered([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  // ─────────────────────────────────────────────
  // SUMMARY STATS
  // ─────────────────────────────────────────────
  const totalAmount = filtered.reduce((s, t) => s + Number(t.amount || 0), 0);
  const avgAmount = filtered.length > 0 ? totalAmount / filtered.length : 0;
  const topCatMap = {};
  filtered.forEach((t) => {
    if (t.category) topCatMap[t.category] = (topCatMap[t.category] || 0) + Number(t.amount || 0);
  });
  const topCat = Object.entries(topCatMap).sort((a, b) => b[1] - a[1])[0];

  // Active filter count
  const activeFilterCount = Object.values(multiFilters).filter((v) => v?.length > 0).length
    + (fromDate ? 1 : 0) + (toDate ? 1 : 0) + (searchText ? 1 : 0);

  // ─────────────────────────────────────────────
  // EXPORTS
  // ─────────────────────────────────────────────
  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      "Txn No": t.txnNo,
      "Amount (₹)": t.amount,
      "Date": t.date,
      "Category": t.category,
      "Merchant": t.merchant,
      "Type": t.transactionType,
      "Card": t.cardName,
      "UPI App": t.upiApp,
      "Recipient": t.recipientName,
      "Notes": t.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Transaction Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}  |  Total: ${currencyFmt(totalAmount)}  |  Count: ${filtered.length}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["Txn No", "Amount", "Date", "Category", "Merchant", "Type", "Card", "Recipient"]],
      body: filtered.map((t) => [
        t.txnNo || "—",
        currencyFmt(t.amount),
        dateFmt(t.date),
        t.category || "—",
        t.merchant || "—",
        t.transactionType || "—",
        t.cardName || "—",
        t.recipientName || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ─────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────
  const tableCols = [
    { key: "date", label: "Date" },
    { key: "amount", label: "Amount" },
    { key: "category", label: "Category" },
    { key: "merchant", label: "Merchant" },
    { key: "transactionType", label: "Type" },
    { key: "cardName", label: "Card" },
    { key: "recipientName", label: "Recipient" },
    { key: "attachments", label: "Receipt" },
  ];

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{
      background: T.bg, minHeight: "100vh",
      padding: "20px 12px 60px",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 900, margin: "auto" }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>
              📋 Transactions
            </h1>
            <p style={{ color: T.sub, margin: "4px 0 0", fontSize: 13 }}>
              {filtered.length} of {data.length} transactions
            </p>
          </div>
          {/* View toggle */}
          <div style={{
            display: "flex", background: "#F1F5F9",
            borderRadius: 10, padding: 3, gap: 3
          }}>
            {[{ k: "cards", icon: "▤" }, { k: "table", icon: "⊞" }].map(({ k, icon }) => (
              <button
                key={k}
                onClick={() => setViewMode(k)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: viewMode === k ? T.indigo : "transparent",
                  color: viewMode === k ? "#fff" : T.sub,
                  cursor: "pointer", fontWeight: 600, fontSize: 16,
                }}
              >{icon}</button>
            ))}
          </div>
        </div>

        {/* ══ SUMMARY STAT CARDS ══ */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            { icon: "💰", label: "Total Spend", value: currencyFmt(totalAmount), color: T.red, bg: T.redBg },
            { icon: "🔢", label: "Transactions", value: filtered.length, color: T.indigo, bg: T.indigoBg },
            { icon: "📊", label: "Average", value: currencyFmt(avgAmount), color: T.yellow, bg: T.yellowBg },
            ...(topCat ? [{ icon: "🔥", label: "Top Category", value: topCat[0], color: "#16A34A", bg: T.greenBg }] : []),
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} style={{
              flex: "1 1 120px", background: bg,
              borderRadius: 14, padding: "12px 16px",
              minWidth: 110,
            }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ══ SEARCH BAR ══ */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", fontSize: 16
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search anything — merchant, category, amount..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%", padding: "13px 14px 13px 42px",
              borderRadius: 14, border: `1.5px solid ${T.border}`,
              background: T.card, fontSize: 14, outline: "none",
              boxSizing: "border-box", color: T.text,
            }}
          />
          {searchText && (
            <button
              onClick={() => handleSearch("")}
              style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", fontSize: 16, color: T.sub,
              }}
            >✕</button>
          )}
        </div>

        {/* ══ FILTER + DATE ROW ══ */}
        <div style={{
          background: T.card, borderRadius: 16,
          padding: "14px 16px", marginBottom: 16,
          boxShadow: T.shadowSm,
        }}>

          {/* Toggle filter panel on mobile */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: filterOpen ? 14 : 0 }}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: activeFilterCount > 0 ? T.indigoBg : "#F8FAFC",
                border: `1.5px solid ${activeFilterCount > 0 ? T.indigo : T.border}`,
                borderRadius: 10, padding: "8px 14px",
                color: activeFilterCount > 0 ? T.indigo : T.sub,
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              🎛️ Filters
              {activeFilterCount > 0 && (
                <span style={{
                  background: T.indigo, color: "#fff",
                  borderRadius: "50%", width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                }}>
                  {activeFilterCount}
                </span>
              )}
              <span style={{ fontSize: 10 }}>{filterOpen ? "▲" : "▼"}</span>
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              {/* Export buttons */}
              <button onClick={exportExcel} style={exportBtnStyle("#16A34A", "#F0FDF4")}>
                📊 Excel
              </button>
              <button onClick={exportPDF} style={exportBtnStyle(T.red, T.redBg)}>
                📄 PDF
              </button>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} style={exportBtnStyle(T.sub, "#F8FAFC")}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Expandable filter panel */}
          {filterOpen && (
            <div>
              {/* Date range */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={filterLabelStyle}>📅 From Date</label>
                  <input
                    type="date" value={fromDate}
                    onChange={(e) => handleDateFrom(e.target.value)}
                    style={filterInputStyle}
                  />
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={filterLabelStyle}>📅 To Date</label>
                  <input
                    type="date" value={toDate}
                    onChange={(e) => handleDateTo(e.target.value)}
                    style={filterInputStyle}
                  />
                </div>
              </div>

              {/* Multi-select dropdowns */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {filterColumns.map(({ key, label }) => {
                  const options = uniqueVals(data, key);
                  const selected = multiFilters[key] || [];
                  if (options.length === 0) return null;

                  return (
                    <div key={key} style={{ position: "relative" }}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 12px", borderRadius: 10,
                          border: `1.5px solid ${selected.length > 0 ? T.indigo : T.border}`,
                          background: selected.length > 0 ? T.indigoBg : "#F8FAFC",
                          color: selected.length > 0 ? T.indigo : T.sub,
                          fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                        {selected.length > 0 && (
                          <span style={{
                            background: T.indigo, color: "#fff",
                            borderRadius: "50%", width: 18, height: 18,
                            fontSize: 10, display: "inline-flex",
                            alignItems: "center", justifyContent: "center", fontWeight: 800,
                          }}>
                            {selected.length}
                          </span>
                        )}
                        <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
                      </button>

                      {openDropdown === key && (
                        <MultiFilterDropdown
                          column={key}
                          options={options}
                          selected={selected}
                          onChange={(vals) => handleMultiFilter(key, vals)}
                          onClose={() => setOpenDropdown(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* ══ LOADING ══ */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, fontSize: 28 }}>⏳</div>
        )}

        {/* ══ EMPTY STATE ══ */}
        {!loading && filtered.length === 0 && (
          <div style={{
            background: T.card, borderRadius: 20, padding: "48px 24px",
            textAlign: "center", boxShadow: T.shadowSm
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>No transactions found</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>
              Try clearing some filters or adjusting the date range.
            </div>
            <button
              onClick={clearAllFilters}
              style={{
                marginTop: 16, background: T.indigo, color: "#fff",
                border: "none", borderRadius: 12, padding: "10px 24px",
                fontWeight: 700, cursor: "pointer"
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* ══ CARD VIEW (mobile default) ══ */}
        {!loading && filtered.length > 0 && viewMode === "cards" && (
          <div>
            {filtered.map((t, i) => (
              <TxnCard
                key={i}
                t={t}
                onImageClick={(imgs, idx) => setLightbox({ images: imgs, index: idx })}
              />
            ))}
          </div>
        )}

        {/* ══ TABLE VIEW (desktop) ══ */}
        {!loading && filtered.length > 0 && viewMode === "table" && (
          <div style={{
            background: T.card, borderRadius: 20,
            boxShadow: T.shadowSm, overflow: "hidden",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%", borderCollapse: "collapse",
                fontSize: 13, minWidth: 700,
              }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {tableCols.map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => key !== "attachments" && handleSort(key)}
                        style={{
                          padding: "12px 14px", textAlign: "left",
                          fontWeight: 700, color: T.sub, fontSize: 12,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                          borderBottom: `2px solid ${T.border}`,
                          cursor: key !== "attachments" ? "pointer" : "default",
                          whiteSpace: "nowrap",
                          userSelect: "none",
                        }}
                      >
                        {label}
                        {key !== "attachments" && (
                          <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const [catBg, catColor] = getCatStyle(t.category);
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: `1px solid ${T.border}`,
                          background: i % 2 === 0 ? "#fff" : "#FAFBFF",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = T.indigoBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFBFF"}
                      >
                        <td style={tdStyle}>{dateFmt(t.date)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: T.red }}>
                          -{currencyFmt(t.amount)}
                        </td>
                        <td style={tdStyle}>
                          {t.category ? (
                            <span style={{
                              background: catBg, color: catColor,
                              borderRadius: 8, padding: "3px 10px",
                              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap"
                            }}>
                              {t.category}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={tdStyle}>{t.merchant || "—"}</td>
                        <td style={tdStyle}>
                          {TYPE_ICON[t.transactionType] || ""} {t.transactionType || "—"}
                        </td>
                        <td style={tdStyle}>{t.cardName || "—"}</td>
                        <td style={tdStyle}>{t.recipientName || "—"}</td>
                        <td style={tdStyle}>
                          {t.attachments?.length > 0 ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              {t.attachments.map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt=""
                                  onClick={() => setLightbox({ images: t.attachments, index: idx })}
                                  style={{
                                    width: 44, height: 44, objectFit: "cover",
                                    borderRadius: 8, cursor: "pointer",
                                    border: `1.5px solid ${T.border}`,
                                    transition: "transform 0.15s",
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                />
                              ))}
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table footer total */}
                <tfoot>
                  <tr style={{ background: T.indigoBg, borderTop: `2px solid ${T.indigo}` }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.indigo }}>
                      Total ({filtered.length})
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: T.red, fontSize: 15 }}>
                      -{currencyFmt(totalAmount)}
                    </td>
                    {tableCols.slice(2).map(({ key }) => (
                      <td key={key} style={tdStyle} />
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ══ LIGHTBOX ══ */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SHARED MICRO-STYLES
// ─────────────────────────────────────────────
const tdStyle = {
  padding: "10px 14px",
  color: "#334155",
  verticalAlign: "middle",
  fontSize: 13,
};

const exportBtnStyle = (color, bg) => ({
  padding: "7px 14px", borderRadius: 10,
  border: `1.5px solid ${color}22`,
  background: bg, color, fontWeight: 700,
  fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
});

const filterLabelStyle = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "#94A3B8", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 5,
};

const filterInputStyle = {
  width: "100%", padding: "9px 12px",
  borderRadius: 10, border: `1.5px solid #E2E8F0`,
  background: "#FAFAFA", fontSize: 13,
  outline: "none", boxSizing: "border-box", color: "#0F172A",
};
