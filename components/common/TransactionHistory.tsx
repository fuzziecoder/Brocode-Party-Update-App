import React, { useMemo, useState } from "react";
import { Transaction, PaymentStatus } from "../../types";
import Card from "./Card";

interface TransactionHistoryProps {
    transactions: Transaction[];
    loading?: boolean;
}

type DateFilter = "7d" | "30d" | "custom" | "all";

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    transactions,
    loading = false,
}) => {
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getStatusBadge = (status: PaymentStatus) => {
        const isPaid = status === PaymentStatus.PAID;
        return (
            <span
                className={`px-2 py-1 text-xs font-semibold rounded-full border ${isPaid
                        ? "bg-green-500/20 text-green-300 border-green-500"
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500"
                    }`}
            >
                {isPaid ? "Paid" : "Pending"}
            </span>
        );
    };

    const filteredTransactions = useMemo(() => {
        if (dateFilter === "all") return transactions;

        const now = new Date();
        const nowAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        return transactions.filter((transaction) => {
            const txDate = new Date(transaction.created_at);
            const txAtMidnight = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();

            if (dateFilter === "7d") {
                const sevenDaysAgo = nowAtMidnight - 6 * 24 * 60 * 60 * 1000;
                return txAtMidnight >= sevenDaysAgo && txAtMidnight <= nowAtMidnight;
            }

            if (dateFilter === "30d") {
                const thirtyDaysAgo = nowAtMidnight - 29 * 24 * 60 * 60 * 1000;
                return txAtMidnight >= thirtyDaysAgo && txAtMidnight <= nowAtMidnight;
            }

            if (dateFilter === "custom") {
                if (!customStart || !customEnd) return true;
                const start = new Date(`${customStart}T00:00:00`).getTime();
                const end = new Date(`${customEnd}T23:59:59`).getTime();
                return txDate.getTime() >= start && txDate.getTime() <= end;
            }

            return true;
        });
    }, [transactions, dateFilter, customStart, customEnd]);

    const showEmptyFiltered = transactions.length > 0 && filteredTransactions.length === 0;

    if (loading) {
        return (
            <Card className="p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4">
                    Transaction History
                </h2>
                <div className="text-center py-8 text-gray-400">Loading...</div>
            </Card>
        );
    }

    return (
        <Card className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-lg md:text-xl font-semibold">
                    Transaction History
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setDateFilter("7d")} className={`px-3 py-1 text-xs rounded-md border ${dateFilter === "7d" ? "bg-zinc-700 border-zinc-600 text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>Last 7 days</button>
                    <button onClick={() => setDateFilter("30d")} className={`px-3 py-1 text-xs rounded-md border ${dateFilter === "30d" ? "bg-zinc-700 border-zinc-600 text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>Last 30 days</button>
                    <button onClick={() => setDateFilter("custom")} className={`px-3 py-1 text-xs rounded-md border ${dateFilter === "custom" ? "bg-zinc-700 border-zinc-600 text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>Custom</button>
                    <button onClick={() => setDateFilter("all")} className={`px-3 py-1 text-xs rounded-md border ${dateFilter === "all" ? "bg-zinc-700 border-zinc-600 text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>All</button>
                </div>
            </div>

            {dateFilter === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                        aria-label="Custom start date"
                    />
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                        aria-label="Custom end date"
                    />
                </div>
            )}

            {filteredTransactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                    {showEmptyFiltered ? "No transactions found for the selected date range." : "No transactions found."}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-2 font-semibold text-gray-300">
                                    Date
                                </th>
                                <th className="text-right py-3 px-2 font-semibold text-gray-300">
                                    Amount
                                </th>
                                <th className="text-left py-3 px-2 font-semibold text-gray-300 hidden sm:table-cell">
                                    Payment Method
                                </th>
                                <th className="text-center py-3 px-2 font-semibold text-gray-300">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((transaction) => (
                                <tr
                                    key={transaction.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="py-3 px-2 text-gray-300">
                                        {formatDate(transaction.created_at)}
                                    </td>
                                    <td className="py-3 px-2 text-right font-semibold">
                                        ₹{transaction.amount.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-2 text-gray-400 hidden sm:table-cell">
                                        {transaction.payment_method}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        {getStatusBadge(transaction.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default TransactionHistory;
