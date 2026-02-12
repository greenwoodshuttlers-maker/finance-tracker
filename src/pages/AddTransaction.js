import { useState, useRef, useEffect } from "react";
import { db, storage } from "../services/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";


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



// ---------- FIELD ----------
const Field = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false
}) => {

  const hasValue = value && value.length > 0;

  return (
    <div style={{
      position: "relative",
      marginBottom: 22
    }}>

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
        top: hasValue ? 4 : 16,
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

  // ---------- GENERATE TXN NUMBER ----------
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

  useEffect(() => {
    setTxnNo(generateTxnNo());
  }, []);


  // ---------- FORM ----------
  const [form, setForm] = useState({
    amount: "",
    date: "",
    recipientName: "",
    upiId: "",
    bankName: "",
    transactionType: "UPI",
    cardName: "",
    category: "",
    notes: ""
  });

  const [images, setImages] = useState([]);

  const uploadRef = useRef();
  const cameraRef = useRef();

  // ---------- TEXT ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ---------- IMAGE PROCESS ----------
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

  // ---------- DELETE IMAGE ----------
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // ---------- SAVE ----------
  const saveTransaction = async () => {

    if (!form.amount || !form.date) {
      alert("Amount & Date required");
      return;
    }

    let urls = [];

    for (const img of images) {
      const imgRef = ref(storage,
        `receipts/${txnNo}/${img.file.name}`
      );

      await uploadBytes(imgRef, img.file);
      const url = await getDownloadURL(imgRef);
      urls.push(url);
    }

    await addDoc(collection(db, "transactions"), {
      txnNo,
      ...form,
      attachments: urls,
      createdAt: new Date()
    });

    alert("Saved ✅");

    setForm({
      amount: "",
      date: "",
      recipientName: "",
      upiId: "",
      bankName: "",
      transactionType: "UPI",
      cardName: "",
      category: "",
      notes: ""
    });

    setImages([]);
    setTxnNo(generateTxnNo());
  };


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

        <h2 style={{ color: theme.text, marginBottom: 10 }}>
          New Transaction
        </h2>

        <Field label="Transaction No"
          name="txnNo"
          value={txnNo}
          disabled
        />

        <Field label="Amount"
          name="amount"
          value={form.amount}
          onChange={handleChange}
        />

        <Field label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
        />

        <Field label="Recipient Name"
          name="recipientName"
          value={form.recipientName}
          onChange={handleChange}
        />

        <Field label="UPI ID"
          name="upiId"
          value={form.upiId}
          onChange={handleChange}
        />

        <Field label="Bank Name"
          name="bankName"
          value={form.bankName}
          onChange={handleChange}
        />

        {/* TYPE */}
        <label style={{ color: theme.sub }}>
          <b>Transaction Type</b>
        </label>

        <select
          name="transactionType"
          value={form.transactionType}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: "#020617",
            color: theme.text,
            border: `1px solid ${theme.border}`,
            marginTop: 6
          }}
        >
          <option>UPI</option>
          <option>Credit Card</option>
          <option>Debit Card</option>
          <option>Cash</option>
        </select>

        <br /><br />

        <label><b>Card Name</b></label>
        <select
          name="cardName"
          value={form.cardName}
          onChange={handleChange}
        >
          <option value="">Select card</option>
          <option>HDFC Regalia</option>
          <option>SBI Cashback</option>
          <option>Axis Ace</option>
          <option>ICICI Amazon</option>
        </select>

        <br /><br />

        <label><b>Category</b></label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
        >
          <option value="">Select category</option>
          <option>Food</option>
          <option>Travel</option>
          <option>Shopping</option>
          <option>Bills</option>
          <option>Entertainment</option>
          <option>Health</option>
          <option>Fuel</option>
        </select>


        <br /><br />

        <Field label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
        />

        <hr style={{ borderColor: theme.border }} />

        <h3 style={{ color: theme.text }}>
          Attachments
        </h3>

        {/* HIDDEN INPUTS */}
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

        <button
          onClick={() => uploadRef.current.click()}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#334155",
            color: "#fff"
          }}>
          📁 Upload
        </button>

        <button
          onClick={() => cameraRef.current.click()}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#334155",
            color: "#fff",
            marginLeft: 10
          }}>
          📸 Camera
        </button>

        {/* PREVIEWS */}
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
                  cursor: "pointer",
                  fontSize: 12
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
          }}>
          Save Transaction
        </button>

      </div>
    </div>
  );
}
