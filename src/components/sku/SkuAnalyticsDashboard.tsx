import React, { useMemo } from 'react';
import { 
  TrendingUp, BarChart3, AlertTriangle, 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface SkuAnalyticsDashboardProps {
  sku: string;
  priceMXN: string;
  mlData: any;
  visitsHistory: any;
  adsHistory: any;
}

const SkuAnalyticsDashboard: React.FC<SkuAnalyticsDashboardProps> = ({ 
  sku, priceMXN, mlData, visitsHistory, adsHistory 
}) => {
  
  // Memoize analytics calculations to prevent re-processing on parent re-renders
  const analytics = useMemo(() => {
    if (!mlData) return [];
    
    const dailyMap: Record<string, any> = {};
    const searchSku = String(sku || '').trim().toUpperCase();
    
    // Group helper
    const processEntries = (entries: any[], type: string) => {
      if (!entries) return;
      entries.forEach(entry => {
        if (String(entry._sku || '').trim().toUpperCase() === searchSku) {
          let rawDate = String(entry._date || 'Unknown Date').trim();
          let dateKey = rawDate;
          
          if (rawDate !== 'Unknown Date') {
             const d = new Date(rawDate);
             if (!isNaN(d.getTime())) {
               dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
             } else {
               dateKey = rawDate.replace(/\s+\d{1,2}:\d{2}.*/, '').trim() || rawDate;
             }
          }
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
          }
          
          const u = parseInt(entry._units, 10) || 1;
          
          if (type === 'valid') {
            dailyMap[dateKey].salesCount++;
            dailyMap[dateKey].unitsCount += u;
          } else if (type === 'cancel') {
            dailyMap[dateKey].cancelCount++;
            dailyMap[dateKey].cancelUnits += u;
          } else if (type === 'refund') {
            dailyMap[dateKey].refundCount++;
            dailyMap[dateKey].refundUnits += u;
          }
        }
      });
    };

    processEntries(mlData.validSales, 'valid');
    processEntries(mlData.cancellations, 'cancel');
    processEntries(mlData.refunds, 'refund');

    if (visitsHistory) {
      Object.keys(visitsHistory).forEach(dateKey => {
        const snapshot = visitsHistory[dateKey];
        if (snapshot.skuData?.some((v: any) => v.sku === searchSku)) {
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
          }
        }
      });
    }

    if (adsHistory) {
      Object.keys(adsHistory).forEach(dateKey => {
        if (adsHistory[dateKey][searchSku]) {
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
          }
        }
      });
    }

    // Fill gaps and convert to sorted array
    const sortedDates = Object.keys(dailyMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    if (sortedDates.length > 0) {
      const minDate = new Date(sortedDates[0]);
      const today = new Date();
      minDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const current = new Date(minDate);
      while (current <= today) {
        const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    return Object.values(dailyMap).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sku, mlData, visitsHistory, adsHistory]);

  const enrichedData = useMemo(() => {
    return [...analytics].reverse().map(row => {
      const searchSku = String(sku || '').trim().toUpperCase();
      const ads = adsHistory?.[row.date]?.[searchSku];
      const visitInfo = visitsHistory?.[row.date]?.skuData?.find((v: any) => v.sku === searchSku);
      
      const adUnits = ads ? (parseInt(ads.adOrders, 10) || 0) : 0;
      const totalUnits = row.unitsCount || 0;
      
      return {
        ...row,
        adUnits,
        organicUnits: Math.max(0, totalUnits - adUnits),
        adSpend: ads ? (parseFloat(ads.adSpend) || 0) : 0,
        visits: visitInfo ? visitInfo.uniqueVisits : 0,
        clicks: ads ? (parseInt(ads.clicks, 10) || 0) : 0,
        impressions: ads ? (parseInt(ads.impressions, 10) || 0) : 0,
        dateShort: row.date.slice(5)
      };
    });
  }, [analytics, sku, adsHistory, visitsHistory]);

  const totals = useMemo(() => {
    return enrichedData.reduce((acc, curr) => ({
      units: acc.units + curr.unitsCount,
      adUnits: acc.adUnits + curr.adUnits,
      organicUnits: acc.organicUnits + curr.organicUnits,
      adSpend: acc.adSpend + curr.adSpend,
      visits: acc.visits + curr.visits,
      clicks: acc.clicks + curr.clicks,
      imps: acc.imps + curr.impressions,
      cancelUnits: acc.cancelUnits + curr.cancelUnits,
      refundUnits: acc.refundUnits + curr.refundUnits,
      lossUsd: acc.lossUsd + curr.lossUsd,
    }), { units: 0, adUnits: 0, organicUnits: 0, adSpend: 0, visits: 0, clicks: 0, imps: 0, cancelUnits: 0, refundUnits: 0, lossUsd: 0 });
  }, [enrichedData]);

  if (analytics.length === 0) {
    return <div className="text-center py-6 text-sm text-gray-500">无法从清洗引擎中找到该 SKU 的流水 (可能暂未在引擎中导入相关报表)</div>;
  }

  return (
    <div className="space-y-4">
      {/* Trend Chart Section */}
      <div className="v2-card bg-slate-50/50 p-4 border-slate-100">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-700">广告与自然销量趋势 (近30天)</span>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-500">总件数</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-slate-500">广告单</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] text-slate-500">自然单</span>
            </div>
          </div>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enrichedData.slice(-30)}>
              <defs>
                <linearGradient id={`colorTotal-${sku}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="dateShort" stroke="#475569" fontSize={9} />
              <YAxis stroke="#475569" fontSize={9} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
              />
              <Area type="monotone" name="总件数" dataKey="unitsCount" stroke="#10b981" fillOpacity={1} fill={`url(#colorTotal-${sku})`} strokeWidth={2} />
              <Area type="monotone" name="广告单" dataKey="adUnits" stroke="#22d3ee" fill="transparent" strokeWidth={2} />
              <Area type="monotone" name="自然单" dataKey="organicUnits" stroke="#6366f1" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="v2-table-wrapper">
        <table className="v2-table">
          <thead className="bg-slate-50 text-slate-500 tracking-wider sticky top-0 z-10 font-medium text-[10px]">
            <tr>
              <th className="px-3 py-2 border-b border-slate-100 text-left">业务日期</th>
              <th className="px-3 py-2 border-b border-slate-100 text-center">流量 (访客 / 广点 / 广曝)</th>
              <th className="px-3 py-2 border-b border-slate-100 text-center">销量拆分 (总 / 广告 / 自然)</th>
              <th className="px-3 py-2 border-b border-slate-100 text-center">广告数据 (消耗/ROAS)</th>
              <th className="px-3 py-2 border-b border-slate-100 text-center">转化率 (自然/全店)</th>
              <th className="px-3 py-2 border-b border-slate-100 text-center">取消/退货 (件)</th>
              <th className="px-3 py-2 border-b border-slate-100 text-right text-red-500">绝对亏损 (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[10px]">
            {/* Global Summary Row */}
            <tr className="bg-sky-500/5 font-bold border-b border-slate-700/50 text-center v2-table-tr">
              <td className="px-3 py-2.5 text-sky-600 text-left text-xs font-bold">全局汇总</td>
              <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                <span className="text-purple-600">{totals.visits.toLocaleString()}</span>
                <span className="mx-1 text-slate-100">/</span>
                <span className="text-sky-600">{totals.clicks.toLocaleString()}</span>
                <span className="mx-1 text-slate-100">/</span>
                <span className="text-slate-300">{totals.imps.toLocaleString()}</span>
              </td>
              <td className="px-3 py-2.5 text-emerald-600 text-xs text-center">
                总 {totals.units} <span className="text-slate-300">/</span> <span className="text-cyan-600">{totals.adUnits}</span> <span className="text-slate-300">/</span> <span className="text-indigo-600">{totals.organicUnits}</span>
              </td>
              <td className="px-3 py-2.5 text-rose-600 font-mono text-[11px]">
                Spend: ${totals.adSpend.toFixed(2)}
              </td>
              <td className="px-3 py-2.5 text-yellow-600 font-mono text-[11px]">
                Conv: {((totals.units / (totals.visits || 1)) * 100).toFixed(2)}%
              </td>
              <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                -{totals.cancelUnits} / -{totals.refundUnits}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-red-500">
                {totals.lossUsd > 0 ? 
                  <span className="flex items-center justify-end"><AlertTriangle className="w-3 h-3 mr-1" />- ${totals.lossUsd.toFixed(2)}</span> : 
                  <span className="text-slate-200">-</span>
                }
              </td>
            </tr>

            {/* Daily Details Rows */}
            {analytics.map((row: any, rIdx: number) => {
              const enriched = enrichedData.find(e => e.date === row.date);
              if (!enriched) return null;
              
              const roas = enriched.adSpend > 0 ? ( (enriched.adUnits * (parseFloat(priceMXN) || 0)) / 17.3 / enriched.adSpend ).toFixed(2) : '0';
              const totalCVR = enriched.visits > 0 ? parseFloat(((enriched.unitsCount / enriched.visits) * 100).toFixed(2)) : 0;
              const organicCVR = enriched.visits > 0 ? parseFloat(((enriched.organicUnits / enriched.visits) * 100).toFixed(2)) : 0;

              return (
                <tr key={rIdx} className="v2-table-tr text-center">
                  <td className="px-3 py-2 text-slate-400 text-left text-[10px] font-mono">{row.date}</td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                    <span className="text-purple-400">{enriched.visits || '-'}</span>
                    <span className="mx-1 text-slate-800">/</span>
                    <span className="text-sky-400">{enriched.clicks || '-'}</span>
                    <span className="mx-1 text-slate-800">/</span>
                    <span className="text-slate-600">{enriched.impressions || '-'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className={`px-2 py-0.5 rounded inline-flex items-center gap-1.5 text-[10px] ${row.salesCount > 0 ? 'bg-slate-800/80 border border-slate-700/50' : 'text-slate-600'}`}>
                      <span className="text-emerald-400 font-bold">{enriched.unitsCount}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-cyan-400">{enriched.adUnits}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-indigo-400">{enriched.organicUnits}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {enriched.adSpend > 0 ? (
                      <div className="flex flex-col items-center">
                        <span className="text-rose-400">${enriched.adSpend.toFixed(1)}</span>
                        <span className="text-[9px] text-slate-600">ROAS: {roas}</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {enriched.visits > 0 ? (
                      <div className="flex flex-col items-center">
                        <span className={organicCVR >= 3 ? 'text-emerald-400' : 'text-slate-500'}>Org: {organicCVR}%</span>
                        <span className="text-[9px] text-slate-600">All: {totalCVR}%</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-[10px]">
                    {(row.cancelUnits > 0 || row.refundUnits > 0) ? (
                      <span className={row.refundUnits > 0 ? 'text-orange-400' : ''}>-{row.cancelUnits || 0} / -{row.refundUnits || 0}</span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[10px]">
                    {row.lossUsd > 0 ? (
                      <span className="text-red-400 flex items-center justify-end"><AlertTriangle className="w-2.5 h-2.5 mr-1" />-${row.lossUsd.toFixed(1)}</span>
                    ) : <span className="text-slate-800">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SkuAnalyticsDashboard;
