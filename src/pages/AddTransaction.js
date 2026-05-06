// AddTransaction.jsx
// Modern Finance Tracker - Smart Add Transaction Page
// Features: OCR receipt reading, auto-category, inline category creation, modern UI

import { useState, useRef, useEffect } from "react";
import { db, storage } from "../services/firebaseConfig";
import { collection, addDoc, getDocs, doc, setDoc, getDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import Tesseract from "tesseract.js";

import {
  updateMonthlySummary,
  updateMerchantSummary,
  updateCardSummary,
  updateCategorySummary
} from "../services/aggregationService";


// ─────────────────────────────────────────────
// CATEGORY CONFIG (keyword → category mapping)
// ─────────────────────────────────────────────
const DEFAULT_CATEGORY_CONFIG = {
  Food: { icon: "🍔", keywords: ["swiggy", "zomato", "restaurant", "cafe", "pizza", "biryani", "burger", "food", "eat", "hotel"] },
  Groceries: { icon: "🛒", keywords: ["bigbasket", "blinkit", "instamart", "dmart", "grocery", "vegetables", "fruits", "supermart", "zepto"] },
  Transport: { icon: "🚗", keywords: ["uber", "ola", "rapido", "irctc", "indigo", "spicejet", "flight", "petrol", "fuel", "metro", "bus", "cab"] },
  Bills: { icon: "📄", keywords: ["rent", "electricity", "water bill", "internet", "broadband", "airtel", "jio", "bsnl", "vi", "recharge", "maintenance"] },
  Shopping: { icon: "🛍️", keywords: ["amazon", "flipkart", "myntra", "meesho", "ajio", "nykaa", "store", "mall", "retail"] },
  Health: { icon: "💊", keywords: ["pharmacy", "apollo", "medplus", "hospital", "clinic", "doctor", "medicine", "diagnostic", "lab"] },
  Entertainment: { icon: "🎬", keywords: ["netflix", "prime", "hotstar", "bookmyshow", "pvr", "inox", "spotify", "youtube"] },
  Investment: { icon: "📈", keywords: ["mutual fund", "stocks", "zerodha", "groww", "sip", "nps", "ppf", "fd"] },
};

// ─────────────────────────────────────────────
// UPI APPS
// ─────────────────────────────────────────────
const UPI_APPS = ["GPay", "PhonePe", "Paytm", "Kiwi", "BHIM", "Amazon Pay"];

// ─────────────────────────────────────────────
// DEBIT CARDS
// ─────────────────────────────────────────────
const DEBIT_CARDS = [
  "HDFC Debit Card",
  "SBI Debit Card",
  "ICICI Debit Card",
  "Axis Debit Card"
];


// ─────────────────────────────────────────────
// OCR UTILITIES
// ─────────────────────────────────────────────

// Extract amount from receipt text
const extractAmount = (text) => {
  const patterns = [
    /(?:total|amount|grand total|net amount|rs\.?|₹)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{2}))\s*(?:only|rupees)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
};

// Extract date from receipt text
const extractDate = (text) => {
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const raw = match[0];
        const parts = raw.split(/[\/\-]/);
        // Detect if yyyy-mm-dd or dd-mm-yyyy
        if (parts[0].length === 4) return `${parts[0]}-${parts[1]}-${parts[2]}`;
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } catch {
        return null;
      }
    }
  }
  return null;
};

// Detect category from OCR text using keyword matching
const detectCategory = (text, categoryConfig) => {
  const lower = text.toLowerCase();
  for (const [category, config] of Object.entries(categoryConfig)) {
    const keywords = Array.isArray(config) ? config : config.keywords || [];
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return null;
};

// Detect merchant name (first meaningful line of receipt)
const extractMerchant = (text) => {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
  return lines[0] || null;
};


// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const S = {
  page: {
    background: "linear-gradient(135deg, #F0F4FF 0%, #FAF5FF 100%)",
    minHeight: "100vh",
    padding: "20px 16px 60px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    maxWidth: 540,
    margin: "auto",
    background: "#FFFFFF",
    borderRadius: 24,
    padding: "28px 24px",
    boxShadow: "0 4px 40px rgba(99,102,241,0.10)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0F172A",
    margin: 0,
  },
  headerSub: {
    fontSize: 13,
    color: "#64748B",
    margin: 0,
  },
  txnBadge: {
    background: "#F1F5F9",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 12,
    color: "#64748B",
    fontFamily: "monospace",
    marginBottom: 22,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  // Type toggle pill
  typeRow: {
    display: "flex",
    background: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
    gap: 4,
  },
  typePill: (active) => ({
    flex: 1,
    padding: "10px 0",
    borderRadius: 11,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s",
    background: active ? "#6366F1" : "transparent",
    color: active ? "#fff" : "#64748B",
    boxShadow: active ? "0 2px 8px rgba(99,102,241,0.25)" : "none",
  }),
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
    marginTop: 4,
  },
  // Modern styled select
  select: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1.5px solid #E2E8F0",
    background: "#FAFAFA",
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 18,
    outline: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='[w3.org](http://www.w3.org/2000/svg)' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    cursor: "pointer",
  },
  // Category chips container
  chipGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 20,
    border: `1.5px solid ${active ? "#6366F1" : "#E2E8F0"}`,
    background: active ? "#EEF2FF" : "#FAFAFA",
    color: active ? "#6366F1" : "#475569",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  addCategoryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 20,
    border: "1.5px dashed #6366F1",
    background: "transparent",
    color: "#6366F1",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  inlineCategoryBox: {
    display: "flex",
    gap: 8,
    marginBottom: 18,
    alignItems: "center",
  },
  inlineCategoryInput: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #6366F1",
    fontSize: 14,
    outline: "none",
    background: "#F8FAFF",
  },
  inlineCategoryConfirm: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#6366F1",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  inlineCategoryCancel: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #E2E8F0",
    background: "#fff",
    color: "#64748B",
    cursor: "pointer",
    fontSize: 14,
  },
  // OCR scanning indicator
  ocrBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 12,
    background: "#FFF7ED",
    border: "1px solid #FED7AA",
    marginBottom: 18,
    fontSize: 13,
    color: "#92400E",
  },
  ocrSuccess: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 12,
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    marginBottom: 18,
    fontSize: 13,
    color: "#166534",
  },
  // Amount input (large, prominent)
  amountWrapper: {
    position: "relative",
    marginBottom: 18,
  },
  amountPrefix: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 22,
    fontWeight: 700,
    color: "#6366F1",
    pointerEvents: "none",
  },
  amountInput: {
    width: "100%",
    padding: "18px 16px 18px 40px",
    borderRadius: 14,
    border: "1.5px solid #E2E8F0",
    fontSize: 28,
    fontWeight: 700,
    color: "#0F172A",
    background: "#FAFBFF",
    outline: "none",
    boxSizing: "border-box",
  },
  // Attachment section
  attachRow: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
  },
  attachBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 12,
    border: "1.5px solid #E2E8F0",
    background: "#FAFAFA",
    fontSize: 14,
    fontWeight: 500,
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.15s",
  },
  previewGrid: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 22,
  },
  previewItem: {
    position: "relative",
    borderRadius: 12,
    overflow: "visible",
  },
  previewImg: {
    width: 88,
    height: 88,
    objectFit: "cover",
    borderRadius: 12,
    border: "1.5px solid #E2E8F0",
  },
  previewRemove: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#EF4444",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  divider: {
    height: 1,
    background: "#F1F5F9",
    margin: "22px 0",
  },
  saveBtn: (loading) => ({
    width: "100%",
    padding: "18px 0",
    borderRadius: 16,
    border: "none",
    background: loading
      ? "#A5B4FC"
      : "linear-gradient(135deg, #6366F1, #8B5CF6)",
    color: "#fff",
    fontSize: 17,
    fontWeight: 700,
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
    transition: "all 0.2s",
    letterSpacing: "0.02em",
  }),
};


// ─────────────────────────────────────────────
// FLOATING INPUT FIELD
// ─────────────────────────────────────────────
const Field = ({ label, name, value, onChange, type = "text", disabled = false, placeholder }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== "" && value !== undefined && value !== null;
  const lifted = focused || hasValue || type === "date";

  return (
    <div style={{ position: "relative", marginBottom: 18 }}>
      <input
        type={type}
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder={lifted ? (placeholder || "") : " "}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "20px 14px 10px 14px",
          borderRadius: 12,
          border: `1.5px solid ${focused ? "#6366F1" : "#E2E8F0"}`,
          background: disabled ? "#F8FAFC" : "#FAFAFA",
          fontSize: 15,
          color: "#0F172A",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
      />
      <label style={{
        position: "absolute",
        left: 14,
        top: lifted ? 6 : "50%",
        transform: lifted ? "none" : "translateY(-50%)",
        fontSize: lifted ? 11 : 15,
        fontWeight: lifted ? 600 : 400,
        color: focused ? "#6366F1" : "#94A3B8",
        background: disabled ? "#F8FAFC" : "#FAFAFA",
        padding: "0 3px",
        transition: "all 0.18s",
        pointerEvents: "none",
        letterSpacing: lifted ? "0.04em" : 0,
        textTransform: lifted ? "uppercase" : "none",
      }}>
        {label}
      </label>
    </div>
  );
};


// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AddTransaction() {

  // ── Transaction number ──
  const generateTxnNo = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `TRX_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };
  const [txnNo, setTxnNo] = useState("");

  // ── Form state ──
  const [form, setForm] = useState({
    amount: "",
    date: "",
    recipientName: "",
    upiId: "",
    upiApp: "",
    bankName: "",
    transactionType: "UPI",
    cardName: "",
    debitCard: "",
    category: "",
    merchant: "",
    notes: "",
  });

  // ── Categories (dynamic) ──
  const [categoryConfig, setCategoryConfig] = useState(DEFAULT_CATEGORY_CONFIG);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🏷️");

  // ── Images ──
  const [images, setImages] = useState([]);
  const uploadRef = useRef();
  const cameraRef = useRef();

  // ── OCR ──
  const [ocrStatus, setOcrStatus] = useState("idle"); // idle | scanning | done | error
  const [ocrFields, setOcrFields] = useState([]);     // list of fields auto-filled

  // ── Credit cards ──
  const [cards, setCards] = useState([]);

  // ── Save loading ──
  const [saving, setSaving] = useState(false);


  // ─────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    setTxnNo(generateTxnNo());
    loadCards();
    loadCustomCategories();
  }, []);

  const loadCards = async () => {
    try {
      const snap = await getDocs(collection(db, "creditCards"));
      setCards(snap.docs.map((d) => d.data().cardName));
    } catch (e) {
      console.warn("Could not load cards", e);
    }
  };

  const loadCustomCategories = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "categories"));
      if (snap.exists()) {
        const custom = snap.data().list || [];
        const merged = { ...DEFAULT_CATEGORY_CONFIG };
        custom.forEach((c) => {
          if (!merged[c.name]) {
            merged[c.name] = { icon: c.icon || "🏷️", keywords: c.keywords || [] };
          }
        });
        setCategoryConfig(merged);
      }
    } catch (e) {
      console.warn("Could not load custom categories", e);
    }
  };


  // ─────────────────────────────────────────────
  // FORM HANDLERS
  // ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setCategory = (cat) => {
    setForm((prev) => ({ ...prev, category: cat, merchant: "" }));
  };


  // ─────────────────────────────────────────────
  // ADD CUSTOM CATEGORY (inline)
  // ─────────────────────────────────────────────
  const handleAddCategory = async () => {
    const name = newCategoryInput.trim();
    if (!name) return;

    // Add to local state
    const newConfig = {
      ...categoryConfig,
      [name]: { icon: newCategoryIcon, keywords: [name.toLowerCase()] },
    };
    setCategoryConfig(newConfig);
    setCategory(name);

    // Persist to Firestore
    try {
      await setDoc(
        doc(db, "settings", "categories"),
        {
          list: arrayUnion({ name, icon: newCategoryIcon, keywords: [name.toLowerCase()] }),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not persist category", e);
    }

    setNewCategoryInput("");
    setNewCategoryIcon("🏷️");
    setShowNewCategory(false);
  };


  // ─────────────────────────────────────────────
  // IMAGE HANDLING
  // ─────────────────────────────────────────────
  const processFiles = async (files) => {
    const processed = [];
    for (const file of files) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      processed.push({ file: compressed, preview: URL.createObjectURL(compressed) });
    }
    setImages((prev) => [...prev, ...processed]);

    // Run OCR on first image only
    if (processed.length > 0) {
      runOCR(processed[0].file);
    }
  };

  const handleUpload = (e) => processFiles([...e.target.files]);
  const handleCamera = (e) => processFiles([...e.target.files]);
  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));


  // ─────────────────────────────────────────────
  // OCR ENGINE
  // ─────────────────────────────────────────────
  const runOCR = async (imageFile) => {
    setOcrStatus("scanning");
    setOcrFields([]);
    try {
      const { data: { text } } = await Tesseract.recognize(imageFile, "eng", {
        logger: () => {}, // silence progress logs
      });

      const autoFilled = [];

      // Extract amount
      const amount = extractAmount(text);
      if (amount) {
        setForm((prev) => ({ ...prev, amount: String(amount) }));
        autoFilled.push("Amount");
      }

      // Extract date
      const date = extractDate(text);
      if (date) {
        setForm((prev) => ({ ...prev, date }));
        autoFilled.push("Date");
      }

      // Detect category
      const category = detectCategory(text, categoryConfig);
      if (category) {
        setForm((prev) => ({ ...prev, category }));
        autoFilled.push("Category");
      }

      // Extract merchant
      const merchant = extractMerchant(text);
      if (merchant) {
        setForm((prev) => ({ ...prev, merchant }));
        autoFilled.push("Merchant");
      }

      setOcrFields(autoFilled);
      setOcrStatus(autoFilled.length > 0 ? "done" : "error");
    } catch (err) {
      console.error("OCR failed", err);
      setOcrStatus("error");
    }
  };


  // ─────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────
  const saveTransaction = async () => {
    if (!form.amount || !form.date) {
      alert("Amount & Date are required.");
      return;
    }
    setSaving(true);

    try {
      let urls = [];
      for (const img of images) {
        const imgRef = ref(storage, `receipts/${txnNo}/${img.file.name}`);
        await uploadBytes(imgRef, img.file);
        const url = await getDownloadURL(imgRef);
        urls.push(url);
      }

      await addDoc(collection(db, "transactions"), {
        txnNo,
        ...form,
        attachments: urls,
        createdAt: new Date(),
      });

      await updateMonthlySummary(form.date, Number(form.amount));
      if (form.merchant) await updateMerchantSummary(form.date, form.merchant, Number(form.amount));
      if (form.transactionType === "Credit Card" && form.cardName)
        await updateCardSummary(form.cardName, Number(form.amount));
      if (form.category) await updateCategorySummary(form.date, form.category, Number(form.amount));

      // Reset
      setForm({
        amount: "", date: "", recipientName: "", upiId: "", upiApp: "",
        bankName: "", transactionType: "UPI", cardName: "", debitCard: "",
        category: "", merchant: "", notes: "",
      });
      setImages([]);
      setOcrStatus("idle");
      setOcrFields([]);
      setTxnNo(generateTxnNo());
    } catch (err) {
      console.error(err);
      alert("Save failed. Check console.");
    } finally {
      setSaving(false);
    }
  };


  // ─────────────────────────────────────────────
  // MERCHANT OPTIONS based on selected category
  // ─────────────────────────────────────────────
  const merchantOptions = form.category
    ? (categoryConfig[form.category]?.keywords || [])
    : [];


  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* ── HEADER ── */}
        <div style={S.header}>
          <div style={S.headerIcon}>💸</div>
          <div>
            <h2 style={S.headerTitle}>New Transaction</h2>
            <p style={S.headerSub}>Fill in or upload a receipt to auto-fill</p>
          </div>
        </div>

        {/* ── TXN BADGE ── */}
        <div style={S.txnBadge}>
          <span>🔖</span>
          <span>{txnNo}</span>
        </div>

        {/* ── TRANSACTION TYPE PILL TOGGLE ── */}
        <p style={S.sectionLabel}>Transaction Type</p>
        <div style={S.typeRow}>
          {["UPI", "Credit Card", "Debit Card", "Cash"].map((t) => (
            <button
              key={t}
              style={S.typePill(form.transactionType === t)}
              onClick={() => setForm((prev) => ({ ...prev, transactionType: t }))}
            >
              {t === "UPI" ? "📲" : t === "Credit Card" ? "💳" : t === "Debit Card" ? "🏧" : "💵"} {t}
            </button>
          ))}
        </div>

        {/* ── DYNAMIC PAYMENT FIELDS ── */}
        {form.transactionType === "UPI" && (
          <>
            <p style={S.sectionLabel}>UPI App</p>
            <select
              name="upiApp"
              value={form.upiApp}
              onChange={handleChange}
              style={S.select}
            >
              <option value="">Select UPI App</option>
              {UPI_APPS.map((app) => (
                <option key={app}>{app}</option>
              ))}
            </select>
            <Field label="UPI ID" name="upiId" value={form.upiId} onChange={handleChange} />
          </>
        )}

        {form.transactionType === "Credit Card" && (
          <>
            <p style={S.sectionLabel}>Credit Card</p>
            <select
              name="cardName"
              value={form.cardName}
              onChange={handleChange}
              style={S.select}
            >
              <option value="">Select Card</option>
              {cards.map((c, i) => (
                <option key={i}>{c}</option>
              ))}
            </select>
          </>
        )}

        {form.transactionType === "Debit Card" && (
          <>
            <p style={S.sectionLabel}>Debit Card</p>
            <select
              name="debitCard"
              value={form.debitCard}
              onChange={handleChange}
              style={S.select}
            >
              <option value="">Select Debit Card</option>
              {DEBIT_CARDS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </>
        )}

        <div style={S.divider} />

        {/* ── ATTACHMENTS (above amount so OCR fills fields) ── */}
        <p style={S.sectionLabel}>Receipt / Attachment</p>

        <input ref={uploadRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCamera} />

        <div style={S.attachRow}>
          <button style={S.attachBtn} onClick={() => uploadRef.current.click()}>
            📎 Upload Receipt
          </button>
          <button style={S.attachBtn} onClick={() => cameraRef.current.click()}>
            📷 Camera
          </button>
        </div>

        {/* OCR STATUS BANNER */}
        {ocrStatus === "scanning" && (
          <div style={S.ocrBanner}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
            Reading receipt... please wait
          </div>
        )}
        {ocrStatus === "done" && ocrFields.length > 0 && (
          <div style={S.ocrSuccess}>
            ✅ Auto-filled from receipt: <strong>{ocrFields.join(", ")}</strong>
          </div>
        )}
        {ocrStatus === "error" && (
          <div style={{ ...S.ocrBanner, background: "#FFF1F2", borderColor: "#FECDD3", color: "#9F1239" }}>
            ⚠️ Couldn't read receipt clearly. Fill manually.
          </div>
        )}

        {/* IMAGE PREVIEWS */}
        {images.length > 0 && (
          <div style={S.previewGrid}>
            {images.map((img, i) => (
              <div key={i} style={S.previewItem}>
                <img src={img.preview} alt="" style={S.previewImg} />
                <button style={S.previewRemove} onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={S.divider} />

        {/* ── AMOUNT ── */}
        <p style={S.sectionLabel}>Amount</p>
        <div style={S.amountWrapper}>
          <span style={S.amountPrefix}>₹</span>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            style={S.amountInput}
          />
        </div>

        {/* ── DATE ── */}
        <Field label="Date" name="date" type="date" value={form.date} onChange={handleChange} />

        {/* ── RECIPIENT ── */}
        <Field label="Paid to / Recipient" name="recipientName" value={form.recipientName} onChange={handleChange} />

        <div style={S.divider} />

        {/* ── CATEGORY CHIPS ── */}
        <p style={S.sectionLabel}>Category</p>
        <div style={S.chipGrid}>
          {Object.entries(categoryConfig).map(([cat, config]) => {
            const icon = typeof config === "object" ? config.icon : "🏷️";
            const active = form.category === cat;
            return (
              <button key={cat} style={S.chip(active)} onClick={() => setCategory(cat)}>
                <span>{icon}</span> {cat}
              </button>
            );
          })}

          {/* ADD NEW CATEGORY CHIP */}
          {!showNewCategory && (
            <button style={S.addCategoryBtn} onClick={() => setShowNewCategory(true)}>
              ＋ New
            </button>
          )}
        </div>

        {/* INLINE NEW CATEGORY INPUT */}
        {showNewCategory && (
          <div style={S.inlineCategoryBox}>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Subscriptions"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              style={S.inlineCategoryInput}
            />
            <input
              type="text"
              placeholder="🏷️"
              value={newCategoryIcon}
              onChange={(e) => setNewCategoryIcon(e.target.value)}
              style={{ ...S.inlineCategoryInput, flex: "0 0 52px", textAlign: "center", fontSize: 20 }}
            />
            <button style={S.inlineCategoryConfirm} onClick={handleAddCategory}>Add</button>
            <button style={S.inlineCategoryCancel} onClick={() => setShowNewCategory(false)}>✕</button>
          </div>
        )}

        {/* ── MERCHANT ── */}
        {form.category && merchantOptions.length > 0 && (
          <>
            <p style={S.sectionLabel}>Merchant</p>
            <select name="merchant" value={form.merchant} onChange={handleChange} style={S.select}>
              <option value="">Select or type below</option>
              {merchantOptions.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </>
        )}

        {/* Allow free-text merchant always */}
        <Field label="Merchant / Store Name" name="merchant" value={form.merchant} onChange={handleChange} />

        {/* ── NOTES ── */}
        <Field label="Notes (optional)" name="notes" value={form.notes} onChange={handleChange} />

        <div style={S.divider} />

        {/* ── SAVE BUTTON ── */}
        <button style={S.saveBtn(saving)} onClick={saveTransaction} disabled={saving}>
          {saving ? "Saving..." : "💾  Save Transaction"}
        </button>

      </div>
    </div>
  );
}
