import { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Transactions() {

    const [data, setData] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({});

    // ---------- FETCH ----------
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const snap = await getDocs(collection(db, "transactions"));
        const d = snap.docs.map(doc => doc.data());
        setData(d);
        setFiltered(d);
    };

    // ---------- FILTER ----------
    const handleFilter = (col, val) => {
        const newFilters = { ...filters, [col]: val };
        setFilters(newFilters);

        let temp = [...data];

        Object.entries(newFilters).forEach(([key, value]) => {
            if (value) {
                temp = temp.filter(t =>
                    String(t[key] || "")
                        .toLowerCase()
                        .includes(value.toLowerCase())
                );
            }
        });

        setFiltered(temp);
    };

    // ---------- EXPORT EXCEL ----------
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtered);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, "transactions.xlsx");
    };

    // ---------- EXPORT PDF ----------
    const exportPDF = () => {
        const doc = new jsPDF();

        autoTable(doc, {
            head: [[
                "Txn No", "Amount", "Date", "Category",
                "Type", "Card", "Recipient"
            ]],
            body: filtered.map(t => [
                t.txnNo,
                t.amount,
                t.date,
                t.category,
                t.transactionType,
                t.cardName,
                t.recipientName
            ])
        });

        doc.save("transactions.pdf");
    };

    // ---------- COLUMNS ----------
    const columns = [
        "txnNo",
        "amount",
        "date",
        "category",
        "transactionType",
        "cardName",
        "recipientName",
        "attachments"
    ];


    // ---------- UI ----------
    return (
        <div style={{ padding: 20 }}>

            <h2>All Transactions</h2>

            <button onClick={exportExcel}>Export Excel</button>
            <button onClick={exportPDF} style={{ marginLeft: 10 }}>
                Export PDF
            </button>

            <hr />

            <table border="1" cellPadding="5">

                <thead>
                    <tr>
                        {columns.map(c => (
                            <th key={c}>
                                {c}
                                {c !== "attachments" && (
                                    <>
                                        <br />
                                        <input
                                            placeholder="filter"
                                            onChange={e => handleFilter(c, e.target.value)}
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


                                return <td key={c}>{t[c]}</td>;
                            })}

                        </tr>
                    ))}
                </tbody>

            </table>

        </div>
    );
}
