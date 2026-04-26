import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

const products = [
  { id: 1, name: '蓝牙无线耳机', sku: 'SKU: AUD-BT-001', sales: '$ 8,231.45', ads: '$ 1,231.25', roas: '6.68', acos: '15.0%', conv: '6.25%', status: '热销爆款', statusColor: 'text-emerald-400 bg-emerald-500/10' },
  { id: 2, name: '运动智能手表', sku: 'SKU: SW-DP-002', sales: '$ 6,432.21', ads: '$ 1,023.45', roas: '6.29', acos: '15.9%', conv: '5.88%', status: '热销爆款', statusColor: 'text-emerald-400 bg-emerald-500/10' },
  { id: 3, name: '1080P 安防摄像头', sku: 'SKU: CAM-WF-003', sales: '$ 5,231.21', ads: '$ 856.23', roas: '6.11', acos: '16.4%', conv: '5.32%', status: '表现良好', statusColor: 'text-sky-400 bg-sky-500/10' },
  { id: 4, name: 'RGB 智能快充头', sku: 'SKU: LAMP-RGB-004', sales: '$ 3,452.11', ads: '$ 789.45', roas: '4.37', acos: '22.8%', conv: '4.25%', status: '潜力商品', statusColor: 'text-amber-400 bg-amber-500/10' },
  { id: 5, name: 'USB-C 20W 充电器', sku: 'SKU: CHG-20W-005', sales: '$ 1,231.23', ads: '$ 623.45', roas: '1.98', acos: '50.6%', conv: '2.11%', status: '表现欠佳', statusColor: 'text-rose-400 bg-rose-500/10' },
];

export default function DashboardTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr className="text-gray-500 text-[11px] uppercase font-bold tracking-wider">
            <th className="px-4 py-2">主要商品</th>
            <th className="px-4 py-2">销售额</th>
            <th className="px-4 py-2">广告支出</th>
            <th className="px-4 py-2">ROAS</th>
            <th className="px-4 py-2">ACOS</th>
            <th className="px-4 py-2">转化率</th>
            <th className="px-4 py-2">状态</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="group hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 rounded-l-xl border-y border-l border-white/5 first:border-l">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    <div className="w-8 h-8 bg-sky-500/20 rounded-md" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">{p.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{p.sku}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 border-y border-white/5 text-sm font-bold text-white">{p.sales}</td>
              <td className="px-4 py-3 border-y border-white/5 text-sm text-gray-300">{p.ads}</td>
              <td className="px-4 py-3 border-y border-white/5">
                <span className={`text-sm font-bold ${Number(p.roas) > 4 ? 'text-emerald-400' : 'text-rose-400'}`}>{p.roas}</span>
              </td>
              <td className="px-4 py-3 border-y border-white/5 text-sm text-gray-300">{p.acos}</td>
              <td className="px-4 py-3 border-y border-white/5 text-sm text-gray-300">{p.conv}</td>
              <td className="px-4 py-3 rounded-r-xl border-y border-r border-white/5">
                <div className={`text-[10px] font-bold px-2 py-1 rounded-full w-fit flex items-center gap-1 ${p.statusColor}`}>
                  {p.statusColor.includes('emerald') ? <TrendingUp className="w-3 h-3" /> : (p.statusColor.includes('rose') ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />)}
                  {p.status}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
