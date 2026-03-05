import { useState, useEffect } from "react";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";

// ---------- MAIN CREDIT CARD PAGE ----------
// This page contains 3 sections:
// 1. Dashboard
// 2. Billing Tracker
// 3. Add New Card

export default function CreditCards() {

    // ---------- STATE ----------
    const [activeTab, setActiveTab] = useState("dashboard");

    const [cards, setCards] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [form, setForm] = useState({
        cardName: "",
        bank: "",
        billingDate: "",
        dueDate: "",
        limit: ""
    });

    // ---------- EXPAND STATE ----------
    const [expanded, setExpanded] = useState({});


    // ---------- TOGGLE CARD ----------
    const toggleCard = (cardName) => {

        setExpanded(prev => ({
            ...prev,
            [cardName]: !prev[cardName]
        }));

    };

    // ---------- LOAD DATA ----------
    useEffect(() => {
        loadCards();
        loadTransactions();
    }, []);



    // ---------- FETCH CREDIT CARDS ----------
    const loadCards = async () => {

        const snap = await getDocs(collection(db, "creditCards"));

        const list = snap.docs.map(d => d.data());

        setCards(list);

    };



    // ---------- FETCH TRANSACTIONS ----------
    const loadTransactions = async () => {

        const snap = await getDocs(collection(db, "transactions"));

        const list = snap.docs.map(d => d.data());

        setTransactions(list);

    };



    // ---------- HANDLE INPUT ----------
    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));

    };



    // ---------- SAVE NEW CARD ----------
    const saveCard = async () => {

        if (!form.cardName) {
            alert("Card Name Required");
            return;
        }

        await addDoc(collection(db, "creditCards"), form);

        alert("Card Added");

        setForm({
            cardName: "",
            bank: "",
            billingDate: "",
            dueDate: "",
            limit: ""
        });

        loadCards();

    };



    // ---------- BILLING CALCULATION ----------
    const getCardSpend = (card) => {

        const billingDate = Number(card.billingDate);

        const now = new Date();

        const start = new Date(
            now.getFullYear(),
            now.getMonth(),
            billingDate
        );

        if (now.getDate() < billingDate) {
            start.setMonth(start.getMonth() - 1);
        }

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        let spend = 0;

        transactions.forEach(t => {

            if (
                t.cardName === card.cardName &&
                new Date(t.date) >= start &&
                new Date(t.date) < end
            ) {
                spend += Number(t.amount || 0);
            }

        });

        return spend;

    };



    // ---------- UI ----------
    return (

        <div style={{ padding: 20 }}>

            <h2>Credit Cards</h2>



            {/* ---------- TAB NAVIGATION ---------- */}

            <div style={{ marginBottom: 20 }}>

                <button onClick={() => setActiveTab("dashboard")}>
                    Dashboard
                </button>

                <button
                    style={{ marginLeft: 10 }}
                    onClick={() => setActiveTab("billing")}>
                    Billing Tracker
                </button>

                <button
                    style={{ marginLeft: 10 }}
                    onClick={() => setActiveTab("add")}>
                    Add New Card
                </button>

            </div>



            {/* ---------- DASHBOARD ---------- */}

            {activeTab === "dashboard" && (

                <div>

                    <h3>Card Dashboard</h3>

                    {cards
                        .sort((a, b) => getCardSpend(b) - getCardSpend(a))
                        .map((card, i) => {

                            const spend = getCardSpend(card);

                            // ---------- BILLING CYCLE ----------
                            const billingDate = Number(card.billingDate);
                            const now = new Date();

                            const start = new Date(
                                now.getFullYear(),
                                now.getMonth(),
                                billingDate
                            );

                            if (now.getDate() < billingDate) {
                                start.setMonth(start.getMonth() - 1);
                            }

                            const end = new Date(start);
                            end.setMonth(end.getMonth() + 1);


                            // ---------- MERCHANT AGG ----------
                            const merchantSpend = {};

                            transactions.forEach(t => {

                                if (
                                    t.cardName === card.cardName &&
                                    new Date(t.date) >= start &&
                                    new Date(t.date) < end
                                ) {

                                    const m = t.merchant || "Other";

                                    merchantSpend[m] =
                                        (merchantSpend[m] || 0) + Number(t.amount || 0);

                                }

                            });

                            const isOpen = expanded[card.cardName];


                            return (

                                <div
                                    key={i}
                                    onClick={() => toggleCard(card.cardName)}
                                    style={{
                                        background: `linear-gradient(135deg,
hsl(${i * 60},70%,55%),
hsl(${i * 60 + 40},70%,45%)
)`,
                                        color: "#fff",
                                        padding: 20,
                                        marginBottom: 16,
                                        borderRadius: 16,
                                        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                        cursor: "pointer"
                                    }}
                                >

                                    <h3 style={{ margin: 0 }}>
                                        {card.cardName}
                                    </h3>

                                    <p style={{ fontSize: 24, fontWeight: "bold" }}>
                                        ₹{spend.toLocaleString()}
                                    </p>

                                    <p style={{ opacity: 0.8 }}>
                                        {start.toLocaleDateString()} –
                                        {end.toLocaleDateString()}
                                    </p>


                                    {/* ---------- EXPANDED VIEW ---------- */}

                                    {isOpen && (

                                        <div style={{ marginTop: 15 }}>

                                            <hr style={{ borderColor: "rgba(255,255,255,0.3)" }} />

                                            <h4>Merchant Spend</h4>

                                            {Object.entries(merchantSpend)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([m, val]) => (

                                                    <div
                                                        key={m}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            padding: "6px 0"
                                                        }}
                                                    >

                                                        <span>{m}</span>
                                                        <span>₹{val.toLocaleString()}</span>

                                                    </div>

                                                ))}

                                        </div>

                                    )}

                                </div>

                            );

                        })}

                </div>

            )}



            {/* ---------- BILLING TRACKER ---------- */}

            {activeTab === "billing" && (

                <div>

                    <h3>Billing Tracker</h3>

                    {cards.map((card, i) => {

                        const spend = getCardSpend(card);

                        return (

                            <div key={i}
                                style={{
                                    background: "#fff",
                                    padding: 20,
                                    marginBottom: 15,
                                    borderRadius: 12,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                }}>

                                <h3>{card.cardName}</h3>

                                <p>Billing Date: {card.billingDate}</p>

                                <p>Due Date: {card.dueDate}</p>

                                <p>Current Bill:
                                    <b> ₹{spend.toLocaleString()}</b>
                                </p>

                            </div>

                        );

                    })}

                </div>

            )}



            {/* ---------- ADD NEW CARD ---------- */}

            {activeTab === "add" && (

                <div>

                    <h3>Add New Card</h3>

                    <input
                        placeholder="Card Name"
                        name="cardName"
                        value={form.cardName}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        placeholder="Bank"
                        name="bank"
                        value={form.bank}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <label>Billing Date</label>

                    <br />

                    <input
                        type="number"
                        name="billingDate"
                        value={form.billingDate}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <label>Due Date</label>

                    <br />

                    <input
                        type="number"
                        name="dueDate"
                        value={form.dueDate}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        placeholder="Credit Limit"
                        name="limit"
                        value={form.limit}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <button onClick={saveCard}>
                        Save Card
                    </button>

                </div>

            )}

        </div>

    );

}