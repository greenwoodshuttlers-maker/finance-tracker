import { useState, useRef, useEffect } from "react";
import { db, storage } from "../services/firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

// ---------- ANALYTICS ENGINE ----------
import {
  updateMonthlySummary,
  updateMerchantSummary,
  updateCardSummary,
  updateCategorySummary
} from "../services/aggregationService";




// ---------- CATEGORY CONFIG ----------
// This ensures categories remain consistent for analytics
const categoryConfig = {
  Food: ["Swiggy", "Zomato", "Restaurant"],
  Groceries: ["Instamart", "BigBasket", "Local Store"],
  Transport: ["Uber", "Ola", "Fuel"],
  Bills: ["Rent", "Electricity", "Internet"],
  Shopping: ["Amazon", "Flipkart"],
  Investment: ["Mutual Fund", "Stocks"]
};

// ---------- UPI APPS CONFIG ----------
// Used when transaction type = UPI
const upiApps = [
  "GPay",
  "PhonePe",
  "Paytm",
  "Kiwi",
  "BHIM",
  "Amazon Pay"
];


// ---------- DEBIT CARD CONFIG ----------
// Temporary list (later we will create DebitCards page like CreditCards)
const debitCards = [
  "HDFC Debit Card",
  "SBI Debit Card",
  "ICICI Debit Card",
  "Axis Debit Card"
];



// ---------- THEME ----------
const theme = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#475569",
  border: "#E2E8F0",
  primary: "#6366F1",
  success: "#22C55E"
};



// ---------- FLOATING INPUT FIELD ----------
const Field = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false
}) => {

  const hasValue = value && value.length > 0;

  // Prevent label overlap for date input
  const isDate = type === "date";

  return (
    <div style={{ position: "relative", marginBottom: 22 }}>

      <input
        type={type}
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder=" "
        style={{
          width: "100%",
          padding: "18px 14px 10px 14px",
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          fontSize: 16,
          outline: "none"
        }}
      />

      <label style={{
        position: "absolute",
        left: 12,
        top: hasValue || isDate ? 4 : 16,
        fontSize: hasValue || isDate ? 12 : 16,
        fontSize: hasValue ? 12 : 16,
        color: "#64748B",
        background: "#FFFFFF",
        padding: "0 4px",
        transition: "0.2s ease",
        pointerEvents: "none"
      }}>
        {label}
      </label>

    </div>
  );
};



export default function AddTransaction() {

  // ---------- GENERATE UNIQUE TRANSACTION NUMBER ----------
  const generateTxnNo = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");

    return `TRX_${y}${m}${day}_${h}${min}${s}`;
  };

  const [txnNo, setTxnNo] = useState("");


  // ---------- FORM STATE ----------
  const [form, setForm] = useState({
    amount: "",
    date: "",
    recipientName: "",
    upiId: "",
    bankName: "",
    transactionType: "UPI",
    cardName: "",
    category: "",
    merchant: "",
    notes: ""
  });

  const [images, setImages] = useState([]);

  const uploadRef = useRef();
  const cameraRef = useRef();

  // ---------- CREDIT CARDS ----------
  const [cards, setCards] = useState([]);


  // ---------- HANDLE TEXT INPUT ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };



  // ---------- IMAGE COMPRESSION ----------
  const processFiles = async (files) => {

    const processed = [];

    for (const file of files) {

      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      });

      processed.push({
        file: compressed,
        preview: URL.createObjectURL(compressed)
      });

    }

    setImages(prev => [...prev, ...processed]);
  };

  const handleUpload = e => processFiles([...e.target.files]);
  const handleCamera = e => processFiles([...e.target.files]);



  // ---------- REMOVE IMAGE ----------
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };



  // ---------- SAVE TRANSACTION ----------
  const saveTransaction = async () => {

    if (!form.amount || !form.date) {
      alert("Amount & Date required");
      return;
    }

    let urls = [];

    // ---------- UPLOAD RECEIPTS ----------
    for (const img of images) {

      const imgRef = ref(storage,
        `receipts/${txnNo}/${img.file.name}`
      );

      await uploadBytes(imgRef, img.file);
      const url = await getDownloadURL(imgRef);
      urls.push(url);

    }


    // ---------- SAVE RAW TRANSACTION ----------
    await addDoc(collection(db, "transactions"), {
      txnNo,
      ...form,
      attachments: urls,
      createdAt: new Date()
    });



    // ---------- UPDATE ANALYTICS ----------
    await updateMonthlySummary(form.date, Number(form.amount));

    if (form.merchant) {
      await updateMerchantSummary(
        form.date,
        form.merchant,
        Number(form.amount)
      );
    }

    if (form.transactionType === "Credit Card" && form.cardName) {
      await updateCardSummary(
        form.cardName,
        Number(form.amount)
      );
    }

    // CATEGORY SUMMARY
    if (form.category) {
      await updateCategorySummary(
        form.date,
        form.category,
        Number(form.amount)
      );
    }

    alert("Saved ✅");


    // ---------- RESET FORM ----------
    setForm({
      amount: "",
      date: "",
      recipientName: "",
      upiId: "",
      bankName: "",
      transactionType: "UPI",
      cardName: "",
      category: "",
      merchant: "",
      notes: ""
    });

    setImages([]);
    setTxnNo(generateTxnNo());
  };

  // ---------- LOAD CREDIT CARDS ----------
  const loadCards = async () => {

    const snap = await getDocs(collection(db, "creditCards"));
    const list = snap.docs.map(d => d.data().cardName);
    setCards(list);

  };

  // ---------- MERCHANT OPTIONS ----------
  const merchantOptions = categoryConfig[form.category] || [];



  // ---------- USE EFFECTS ----------
  useEffect(() => {
    setTxnNo(generateTxnNo());
    loadCards();
  }, []);




  // ---------- UI ----------
  return (

    <div style={{
      background: theme.bg,
      minHeight: "100vh",
      padding: 16
    }}>

      <div style={{
        maxWidth: 520,
        margin: "auto",
        background: theme.card,
        padding: 20,
        borderRadius: 18
      }}>

        <h2 style={{ color: theme.text }}>
          New Transaction
        </h2>



        <Field
          label="Transaction No"
          name="txnNo"
          value={txnNo}
          disabled
        />



        <Field
          label="Amount"
          name="amount"
          value={form.amount}
          onChange={handleChange}
        />



        <Field
          label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
        />



        {/* TRANSACTION TYPE */}

        <label><b>Transaction Type</b></label>

        <select
          name="transactionType"
          value={form.transactionType}
          onChange={handleChange}
          style={{ width: "100%", padding: 12 }}
        >

          <option>UPI</option>
          <option>Credit Card</option>
          <option>Debit Card</option>
          <option>Cash</option>

        </select>

        <br /><br />


        {/* --------------------------------------------------  
           DYNAMIC PAYMENT SECTION 
           Fields change based on Transaction Type
          -------------------------------------------------- */}


        {/* UPI SECTION */}

        {form.transactionType === "UPI" && (

          <>
            <label><b>UPI App</b></label>

            <select
              name="upiApp"
              value={form.upiApp}
              onChange={handleChange}
              style={{ width: "100%", padding: 12 }}
            >

              <option value="">Select UPI App</option>

              {upiApps.map(app => (
                <option key={app}>{app}</option>
              ))}

            </select>

            <br /><br />

            <Field
              label="UPI ID"
              name="upiId"
              value={form.upiId}
              onChange={handleChange}
            />

          </>

        )}



        {/* CREDIT CARD SECTION */}

        {form.transactionType === "Credit Card" && (

          <>
            <label><b>Credit Card</b></label>

            <select
              name="cardName"
              value={form.cardName}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                background: "#FFFFFF"
              }}
            >

              <option value="">Select Card</option>

              {cards.map((c, i) => (
                <option key={i}>{c}</option>
              ))}

            </select>

            <br /><br />

          </>

        )}



        {/* DEBIT CARD SECTION */}

        {form.transactionType === "Debit Card" && (

          <>
            <label><b>Debit Card</b></label>

            <select
              name="debitCard"
              value={form.debitCard}
              onChange={handleChange}
              style={{ width: "100%", padding: 12 }}
            >

              <option value="">Select Debit Card</option>

              {debitCards.map(c => (
                <option key={c}>{c}</option>
              ))}

            </select>

            <br /><br />

          </>

        )}



        {/* CATEGORY */}

        <label><b>Category</b></label>

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          style={{ width: "100%", padding: 12 }}
        >

          <option value="">Select category</option>

          {Object.keys(categoryConfig).map(cat => (
            <option key={cat}>{cat}</option>
          ))}

        </select>

        <br /><br />



        {/* MERCHANT */}

        <label><b>Merchant</b></label>

        <select
          name="merchant"
          value={form.merchant}
          onChange={handleChange}
          style={{ width: "100%", padding: 12 }}
        >

          <option value="">Select merchant</option>

          {merchantOptions.map(m => (
            <option key={m}>{m}</option>
          ))}

        </select>

        <br /><br />



        <Field
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
        />



        {/* IMAGE SECTION */}

        <h3>Attachments</h3>

        <input ref={uploadRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleUpload}
        />

        <input ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleCamera}
        />

        <button onClick={() => uploadRef.current.click()}>
          Upload
        </button>

        <button onClick={() => cameraRef.current.click()}
          style={{ marginLeft: 10 }}>
          Camera
        </button>



        {/* IMAGE PREVIEW */}

        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 15
        }}>

          {images.map((img, i) => (
            <div key={i} style={{ position: "relative" }}>

              <img
                src={img.preview}
                width="90"
                alt=""
                style={{ borderRadius: 10 }}
              />

              <span
                onClick={() => removeImage(i)}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "red",
                  color: "#fff",
                  borderRadius: "50%",
                  padding: "2px 7px",
                  cursor: "pointer"
                }}>
                ✕
              </span>

            </div>
          ))}

        </div>



        <br />



        <button
          onClick={saveTransaction}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "none",
            background: theme.success,
            color: "#fff",
            fontSize: 16,
            fontWeight: "600"
          }}
        >
          Save Transaction
        </button>



      </div>
    </div>

  );
}