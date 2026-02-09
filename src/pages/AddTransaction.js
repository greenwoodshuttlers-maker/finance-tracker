import { useState } from "react";
import imageCompression from "browser-image-compression";
import { storage, db } from "../services/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import Tesseract from "tesseract.js";

export default function AddTransaction(){

const [image,setImage]=useState(null);
const [uploading,setUploading]=useState(false);

const [form,setForm]=useState({
  amount:"",
  transactionId:"",
  date:"",
  recipientName:"",
  upiId:"",
  bankName:"",
  transactionType:"UPI",
  cardName:"",
  category:"",
  notes:"",
  imageUrl:""
});


// ---------- IMAGE ----------

const handleImage=async(e)=>{
  const file=e.target.files[0];
  if(!file) return;

  const compressed=await imageCompression(file,{
    maxSizeMB:0.4,
    maxWidthOrHeight:1600,
    useWebWorker:true
  });

  setImage(compressed);
};


// ---------- SMART OCR PARSER ----------

const parseOCR=(text)=>{
  console.log("OCR:",text);

  // AMOUNT (very tolerant)
  const amtMatch = text.match(/(?:₹|Rs\.?|INR)?\s?([\d,]{3,})/);
  
  // TXN
  const txnMatch=text.match(/(UPI|Google).*ID[:\s]*([A-Z0-9\-]+)/i);

  // UPI
  const upiMatch=text.match(/[A-Za-z0-9.\-_]+@[a-zA-Z]+/);

  // DATE
  const dateMatch=text.match(/\d{1,2}\s\w+\s\d{4}/);

  // NAME
  const nameMatch=text.match(/To:\s*([A-Z\s]+)/i);

  // BANK
  const bankMatch=text.match(/\(([^)]+Bank)\)/i);

  setForm(prev=>({
    ...prev,
    amount:amtMatch?amtMatch[1].replace(/,/g,""):"",
    transactionId:txnMatch?txnMatch[2]:"",
    upiId:upiMatch?upiMatch[0]:"",
    date:dateMatch?dateMatch[0]:"",
    recipientName:nameMatch?nameMatch[1]:"",
    bankName:bankMatch?bankMatch[1]:""
  }));
};

const runOCR=async(file)=>{
  const result=await Tesseract.recognize(file,"eng");
  parseOCR(result.data.text);
};


// ---------- UPLOAD ----------

const uploadAndScan=async()=>{
  if(!image) return alert("Select image");

  setUploading(true);

  const imgRef=ref(storage,`receipts/${Date.now()}.jpg`);
  await uploadBytes(imgRef,image);
  const url=await getDownloadURL(imgRef);

  await runOCR(image);

  setForm(prev=>({...prev,imageUrl:url}));

  setUploading(false);
};


// ---------- SAVE ----------

const handleChange=(e)=>{
  setForm({...form,[e.target.name]:e.target.value});
};

const saveTransaction=async()=>{
  await addDoc(collection(db,"transactions"),{
    ...form,
    createdAt:new Date()
  });
  alert("Saved!");
};


// ---------- UI FIELD ----------

const Field=({label,name,type="text"})=>(
<div style={{marginBottom:12}}>
<label><b>{label}</b></label><br/>
<input
  name={name}
  type={type}
  value={form[name]}
  onChange={handleChange}
  style={{width:250,padding:6}}
/>
</div>
);


return(
<div style={{textAlign:"center",marginTop:30}}>
<h2>Add Transaction</h2>

<input type="file" accept="image/*" onChange={handleImage}/>
<br/><br/>

<button onClick={uploadAndScan} disabled={uploading}>
{uploading?"Scanning...":"Upload & Auto Fill"}
</button>

<hr/>
<h3>Edit Details</h3>

<Field label="Amount" name="amount" type="number"/>
<Field label="Transaction ID" name="transactionId"/>
<Field label="Date" name="date"/>
<Field label="Recipient Name" name="recipientName"/>
<Field label="UPI ID" name="upiId"/>
<Field label="Bank Name" name="bankName"/>

{/* TYPE DROPDOWN */}
<label><b>Transaction Type</b></label><br/>
<select name="transactionType" onChange={handleChange}>
<option>UPI</option>
<option>Credit Card</option>
<option>Debit Card</option>
<option>Cash</option>
</select><br/><br/>

{/* CARD DROPDOWN + TYPE */}
<label><b>Card Name</b></label><br/>
<input
list="cards"
name="cardName"
onChange={handleChange}
/>
<datalist id="cards">
<option>HDFC Timescard</option>
<option>HDFC Swiggy</option>
<option>Yes Bank</option>
<option>Axis Reward</option>
<option>ICICI Amazon</option>
<option>Axis Flipkart</option>
<option>IDFC</option>
<option>HSBC</option>
</datalist>
<br/><br/>

{/* CATEGORY */}
<label><b>Category</b></label><br/>
<input
list="cats"
name="category"
onChange={handleChange}
/>
<datalist id="cats">
<option>Food</option>
<option>Travel</option>
<option>Shopping</option>
<option>Bills</option>
<option>Entertainment</option>
<option>Investment</option>
<option>Swiggy</option>
</datalist>
<br/><br/>

<Field label="Notes" name="notes"/>

<button onClick={saveTransaction}>Save Transaction</button>

</div>
);
}
