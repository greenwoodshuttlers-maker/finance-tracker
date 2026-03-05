import { db } from "./firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  increment,
  getDoc
} from "firebase/firestore";


// ---------- UPDATE MONTHLY TOTAL ----------
export const updateMonthlySummary = async (date, amount) => {

  const d = new Date(date);

  const monthKey =
    d.getFullYear() + "-" +
    String(d.getMonth()+1).padStart(2,"0");

  const ref = doc(db, "monthlySummary", monthKey);

  const snap = await getDoc(ref);

  if(snap.exists()){
    await updateDoc(ref,{
      totalSpend: increment(amount)
    });
  }else{
    await setDoc(ref,{
      totalSpend: amount
    });
  }
};



// ---------- UPDATE MERCHANT SUMMARY ----------
export const updateMerchantSummary = async (date, merchant, amount) => {

  const d = new Date(date);

  const monthKey =
    d.getFullYear() + "-" +
    String(d.getMonth()+1).padStart(2,"0");

  const ref = doc(db, "merchantSummary", monthKey);

  const snap = await getDoc(ref);

  if(snap.exists()){
    await updateDoc(ref,{
      [merchant]: increment(amount)
    });
  }else{
    await setDoc(ref,{
      [merchant]: amount
    });
  }
};



// ---------- UPDATE CREDIT CARD SUMMARY ----------
export const updateCardSummary = async (account, amount) => {

  const ref = doc(db,"cardSummary",account);

  const snap = await getDoc(ref);

  if(snap.exists()){
    await updateDoc(ref,{
      currentCycleSpend: increment(amount)
    });
  }else{
    await setDoc(ref,{
      currentCycleSpend: amount
    });
  }
};

// ---------- UPDATE CATEGORY SUMMARY ----------
export const updateCategorySummary = async (date, category, amount) => {

 const d = new Date(date);

 const monthKey =
   d.getFullYear() + "-" +
   String(d.getMonth()+1).padStart(2,"0");

 const ref = doc(db, "categorySummary", monthKey);

 const snap = await getDoc(ref);

 if(snap.exists()){
   await updateDoc(ref,{
     [category]: increment(amount)
   });
 }else{
   await setDoc(ref,{
     [category]: amount
   });
 }

};