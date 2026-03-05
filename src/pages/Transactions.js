// ------------------------------------------------------
// TRANSACTIONS PAGE
// Shows all transactions with column filters,
// attachment previews, export to Excel/PDF
// and dynamic totals.
// ------------------------------------------------------

import { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Transactions() {

    // ------------------------------------------------------
    // STATE VARIABLES
    // ------------------------------------------------------

    // All transactions from Firestore
    const [data, setData] = useState([]);

    // Filtered rows shown in table
    const [filtered, setFiltered] = useState([]);

    // Column filter values
    const [filters, setFilters] = useState({});

    // ---------- DATE RANGE FILTER ----------
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");



    // ------------------------------------------------------
    // FETCH TRANSACTIONS FROM FIRESTORE
    // ------------------------------------------------------

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {

        const snap = await getDocs(collection(db, "transactions"));

        const d = snap.docs.map(doc => doc.data());

        // Sort latest first
        d.sort((a, b) => new Date(b.date) - new Date(a.date));

        setData(d);
        setFiltered(d);
    };

    // ------------------------------------------------------
    // APPLY COLUMN FILTERS + DATE RANGE FILTER
    // ------------------------------------------------------

    const applyFilters = (newFilters, from = fromDate, to = toDate) => {

        let temp = [...data];

        // ---------- COLUMN FILTERS ----------
        Object.entries(newFilters).forEach(([key, value]) => {

            if (value) {
                temp = temp.filter(t =>
                    String(t[key] || "")
                        .toLowerCase()
                        .includes(value.toLowerCase())
                );
            }

        });

        // ---------- DATE RANGE FILTER ----------
        if (from) {
            temp = temp.filter(t =>
                new Date(t.date) >= new Date(from)
            );
        }

        if (to) {
            temp = temp.filter(t =>
                new Date(t.date) <= new Date(to)
            );
        }

        setFiltered(temp);
    };



    const handleFilter = (col, val) => {

        const newFilters = { ...filters, [col]: val };

        setFilters(newFilters);

        applyFilters(newFilters);
    };


    // ------------------------------------------------------
    // CALCULATE TOTAL AMOUNT
    // Total automatically changes when filters change
    // ------------------------------------------------------

    const totalAmount = filtered.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
    );



    // ------------------------------------------------------
    // EXPORT FILTERED DATA TO EXCEL
    // ------------------------------------------------------

    const exportExcel = () => {

        const ws = XLSX.utils.json_to_sheet(filtered);

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Transactions");

        XLSX.writeFile(wb, "transactions.xlsx");
    };



    // ------------------------------------------------------
    // EXPORT FILTERED DATA TO PDF
    // ------------------------------------------------------

    const exportPDF = () => {

        const doc = new jsPDF();

        autoTable(doc, {
            head: [[
                "Txn No",
                "Amount",
                "Date",
                "Category",
                "Merchant",
                "Type",
                "Card",
                "Recipient"
            ]],

            body: filtered.map(t => [
                t.txnNo,
                t.amount,
                t.date,
                t.category,
                t.merchant,
                t.transactionType,
                t.cardName,
                t.recipientName
            ])
        });

        doc.save("transactions.pdf");
    };



    // ------------------------------------------------------
    // TABLE COLUMN ORDER
    // Merchant added for analytics
    // ------------------------------------------------------

    const columns = [
        "txnNo",
        "amount",
        "date",
        "category",
        "merchant",
        "transactionType",
        "cardName",
        "recipientName",
        "attachments"
    ];



    // ------------------------------------------------------
    // UI
    // ------------------------------------------------------

    return (

        <div style={{ padding: 20 }}>

            <h2>All Transactions</h2>

            {/* ----  DATE RANGE FILTER   --- */}

            <div style={{ marginTop: 10, marginBottom: 15 }}>

                <label>From:</label>

                <input
                    type="date"
                    value={fromDate}
                    onChange={e => {
                        const v = e.target.value;
                        setFromDate(v);
                        applyFilters(filters, v, toDate);
                    }}
                    style={{ marginLeft: 10, marginRight: 20 }}
                />


                <label>To:</label>

                <input
                    type="date"
                    value={toDate}
                    onChange={e => {
                        const v = e.target.value;
                        setToDate(v);
                        applyFilters(filters, fromDate, v);
                    }}
                    style={{ marginLeft: 10 }}
                />

            </div>

            {/* ------------------------------------------------------
               EXPORT BUTTONS
            ------------------------------------------------------ */}

            <button onClick={exportExcel}>
                Export Excel
            </button>

            <button
                onClick={exportPDF}
                style={{ marginLeft: 10 }}
            >
                Export PDF
            </button>



            {/* ------------------------------------------------------
               TOTAL AMOUNT DISPLAY
               Adjusts when filters are applied
            ------------------------------------------------------ */}

            <div style={{
                marginTop: 15,
                marginBottom: 15,
                padding: 10,
                background: "#ffffff",
                borderRadius: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}>
                <b>Total Amount: ₹{totalAmount.toLocaleString()}</b>
            </div>



            {/* ------------------------------------------------------
               TRANSACTION TABLE
            ------------------------------------------------------ */}

            <table
                border="1"
                cellPadding="6"
                style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    background: "#ffffff"
                }}
            >

                <thead style={{ background: "#f1f5f9" }}>
                    <tr>

                        {columns.map(c => (
                            <th key={c}>

                                {/* COLUMN NAME */}
                                {c}

                                {/* FILTER INPUT */}
                                {c !== "attachments" && (
                                    <>
                                        <br />
                                        <input
                                            placeholder="filter"
                                            onChange={e =>
                                                handleFilter(c, e.target.value)
                                            }
                                            style={{
                                                width: "90%",
                                                marginTop: 5
                                            }}
                                        />
                                    </>
                                )}

                            </th>
                        ))}

                    </tr>
                </thead>



                <tbody>

                    {filtered.map((t, i) => (

                        <tr key={i}>

                            {columns.map(c => {

                                // ------------------------------------------------------
                                // ATTACHMENT IMAGE PREVIEW
                                // ------------------------------------------------------

                                if (c === "attachments") {

                                    return (
                                        <td key={c}>

                                            {t.attachments?.length > 0 ? (

                                                t.attachments.map((url, idx) => (

                                                    <img
                                                        key={idx}
                                                        src={url}
                                                        alt=""
                                                        width="40"
                                                        style={{
                                                            margin: 3,
                                                            cursor: "pointer",
                                                            borderRadius: 4
                                                        }}
                                                        onClick={() => window.open(url)}
                                                    />

                                                ))

                                            ) : "-"}

                                        </td>
                                    );
                                }



                                // ------------------------------------------------------
                                // NORMAL COLUMN VALUE
                                // ------------------------------------------------------

                                return (
                                    <td key={c}>
                                        {t[c] || "-"}
                                    </td>
                                );

                            })}

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>
    );
}