import React from "react";
import { Transaction, PaymentStatus } from "../../types";
import Card from "./Card";

interface TransactionHistoryProps {
    transactions: Transaction[];
    loading?: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    transactions,
    loading = false,
}) => {
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
            <h2 className="text-lg md:text-xl font-semibold mb-4">
                Transaction History
            </h2>

            {transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                    No transactions found.
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
                            {transactions.map((transaction) => (
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
