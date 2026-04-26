import React, { useState } from 'react';
import { motion } from 'motion/react';

export default function DataTable({ data, title, type = 'valid' }: { data: any[], title: string, type?: string }) {

  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  
  if (!data || data.length === 0) return null;

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const currentData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getRowStyle = () => {
    if (type === 'refund') return 'border-l-4 border-l-orange-500';
    if (type === 'cancel') return 'border-l-4 border-l-red-500';
    return 'border-l-4 border-l-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 mb-8"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold font-sans text-white">{title} ({data.length})</h3>
        <div className="flex space-x-2">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 bg-white/10 rounded disabled:opacity-50 text-sm hover:bg-white/20 transition"
          >
            上一页
          </button>
          <span className="text-sm py-1 px-2 text-gray-400">{page + 1} / {totalPages}</span>
          <button 
            disabled={page >= totalPages - 1} 
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 bg-white/10 rounded disabled:opacity-50 text-sm hover:bg-white/20 transition"
          >
            下一页
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs uppercase bg-black/20 text-gray-400">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">订单号 (Order ID)</th>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">件数 (Units)</th>
              <th className="px-4 py-3">状态 (Status)</th>
              {type !== 'valid' && <th className="px-4 py-3 text-red-400">损失金额 (USD)</th>}
              <th className="px-4 py-3 rounded-tr-lg text-right">总计金额 (USD)</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row) => (
              <tr 
                key={row._orderId || `${row._sku}-${row._date}-${row._units}`} 
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${getRowStyle()}`}
              >
                <td className="px-4 py-3 font-medium text-white">{row._orderId}</td>
                <td className="px-4 py-3 text-xs">{row._date}</td>
                <td className="px-4 py-3">{row._sku}</td>
                <td className="px-4 py-3 text-emerald-400 font-bold">{row._units || 1}</td>
                <td className="px-4 py-3">
                    <span className="truncate block max-w-[200px] text-xs opacity-80" title={row['Status']}>
                        {row['Status']}
                    </span>
                </td>
                {type !== 'valid' && (
                  <td className="px-4 py-3 text-red-400 font-bold">
                    -$ {(row._exactLossUSD || 0).toFixed(2)}
                  </td>
                )}
                <td className="px-4 py-3 text-right font-medium">
                  $ {(row._totalUSD || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
