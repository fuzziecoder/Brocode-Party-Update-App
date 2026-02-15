import React, { useState, useEffect } from 'react';
import { HistoryIcon, Download, Filter } from 'lucide-react';
import { supabase } from '../services/supabase';

interface SpotHistoryItem {
  id: string;
  name: string;
  date: string;
  total_amount: number;
  payment_status: string;
  items_count: number;
}

export const SpotHistory: React.FC = () => {
  const [history, setHistory] = useState<SpotHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });

  useEffect(() => {
    fetchSpotHistory();
  }, []);

  const fetchSpotHistory = async () => {
    try {
      setLoading(true);
      // Fetch completed/archived spots from database
      const { data, error } = await supabase
        .from('spots')
        .select('id, name, created_at, total_amount, payment_status, items_count')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        date: item.created_at, // Map created_at to date
        total_amount: item.total_amount,
        payment_status: item.payment_status,
        items_count: item.items_count
      }));

      setHistory(formattedData);
    } catch (error) {
      console.error('Error fetching spot history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Export functionality to CSV/PDF
    const csv = history
      .map(item => `${item.name},${item.date},${item.total_amount},${item.payment_status}`)
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spot-history.csv';
    a.click();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Spot History</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">From Date</label>
          <input
            type="date"
            value={dateFilter.from}
            onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">To Date</label>
          <input
            type="date"
            value={dateFilter.to}
            onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading history...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Spot Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Items</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No spots in history
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{item.total_amount.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${item.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{item.items_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SpotHistory;
