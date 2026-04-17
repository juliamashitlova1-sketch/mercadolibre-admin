import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SKUStats } from '../types';
import { USD_TO_MXN } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
}

export default function Ads() {
  const { skuData, allSkuData } = useOutletContext<ContextType>();
  const todayStr = getMexicoDateString();

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filtered = useMemo(() => filterByDateRange(allSkuData, startDate, endDate), [allSkuData, startDate, endDate]);

  const adMetrics = useMemo(() => {
    const totalAdSpend = filtered.reduce((s, d) => s + (d.adSpend || 0), 0); // MXN
    const totalSales = filtered.reduce((s, d) => s + (d.sales || 0), 0);
    const totalClicks = filtered.reduce((s, d) => s + (d.clicks || 0), 0);
    const totalImpressions = filtered.reduce((s, d) => s + (d.impressions || 0), 0);
    // 核心修正：ACOS/ROAS 基于广告产生的销售额计算
    const totalAdSalesUSD = filtered.reduce((s, d) => s + ((d.adOrders || 0) * (d.sellingPrice || 0) / USD_TO_MXN), 0);
    const totalSalesUSD = filtered.reduce((s, d) => s + ((d.orders || 0) * (d.sellingPrice || 0) / USD_TO_MXN), 0);
    const totalAdSpendUSD = totalAdSpend / USD_TO_MXN;
    
    const acos = totalAdSalesUSD > 0 ? (totalAdSpendUSD / totalAdSalesUSD) * 100 : 0;
    const roas = totalAdSpendUSD > 0 ? totalAdSalesUSD / totalAdSpendUSD : 0;
    const tacos = totalSalesUSD > 0 ? (totalAdSpendUSD / totalSalesUSD) * 100 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // 按SKU聚合
    const bySku: Record<string, { adSpend: number; adSales: number; totalSales: number; clicks: number; impressions: number; adOrders: number; cpc: number; name: string }> = {};
    filtered.forEach(item => {
      if (!bySku[item.sku]) bySku[item.sku] = { adSpend: 0, adSales: 0, totalSales: 0, clicks: 0, impressions: 0, adOrders: 0, cpc: 0, name: item.skuName || '' };
      bySku[item.sku].adSpend += item.adSpend || 0;
      bySku[item.sku].adSales += ((item.adOrders || 0) * (item.sellingPrice || 0)) / USD_TO_MXN;
      bySku[item.sku].totalSales += ((item.orders || 0) * (item.sellingPrice || 0)) / USD_TO_MXN;
      bySku[item.sku].clicks += item.clicks || 0;
      bySku[item.sku].impressions += item.impressions || 0;
      bySku[item.sku].adOrders += item.adOrders || 0;
    });
    const skuAds = Object.entries(bySku).map(([sku, d]) => ({
      sku, ...d,
      acos: d.adSales > 0 ? (d.adSpend / USD_TO_MXN / d.adSales) * 100 : 0,
      roas: d.adSpend > 0 ? d.adSales / (d.adSpend / USD_TO_MXN) : 0,
      tacos: d.totalSales > 0 ? (d.adSpend / USD_TO_MXN / d.totalSales) * 100 : 0,
      cpc: d.clicks > 0 ? (d.adSpend / USD_TO_MXN) / d.clicks : 0,
    })).sort((a, b) => b.adSpend - a.adSpend);

    // 按日趋势
    const byDate: Record<string, { sales: number; adSpend: number }> = {};
    filtered.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, adSpend: 0 };
      byDate[item.date].sales += item.sales || 0;
      byDate[item.date].adSpend += item.adSpend || 0;
    });
    const chartData = Object.entries(byDate).map(([date, d]) => ({ date, totalSales: d.sales, adSpend: d.adSpend })).sort((a, b) => a.date.localeCompare(b.date));

    return { totalAdSpend, totalSales, acos, roas, tacos, ctr, skuAds, chartData };
  }, [filtered]);

  const isSingleDay = startDate === endDate && startDate;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">广告分析与调优 (Mercado Ads)</h2>
        <p className="text-slate-500 text-sm">监控广告投放效果，优化 ACOS 与关键词竞价</p>
      </header>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">{isSingleDay ? '当日' : '累计'}广告费</div>
          <div className="stat-value">${adMetrics.totalAdSpend.toLocaleString()} <span className="text-xs font-normal text-slate-500">MXN</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 ACOS</div>
          <div className="stat-value text-sky-500">{adMetrics.acos.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">基于广告订单计算</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 TACOS</div>
          <div className="stat-value text-indigo-500">{adMetrics.tacos.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">占全店总营收比例</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 ROAS</div>
          <div className="stat-value text-emerald-600">{adMetrics.roas.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均 CTR</div>
          <div className="stat-value">{adMetrics.ctr.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
          <CardHeader><CardTitle className="text-base font-semibold">广告费 vs 销售额趋势</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {adMetrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adMetrics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="totalSales" stroke="#0ea5e9" strokeWidth={2} name="销售额" />
                  <Line type="monotone" dataKey="adSpend" stroke="#f59e0b" strokeWidth={2} name="广告费" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">所选日期范围内暂无数据</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
          <CardHeader><CardTitle className="text-base font-semibold">单品广告表现</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px]">SKU (名称)</TableHead>
                  <TableHead className="text-[11px]">曝光/点击</TableHead>
                  <TableHead className="text-[11px]">CPC</TableHead>
                  <TableHead className="text-[11px]">ACOS</TableHead>
                  <TableHead className="text-[11px]">ROAS</TableHead>
                  <TableHead className="text-[11px]">广告订单</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adMetrics.skuAds.length > 0 ? adMetrics.skuAds.map((sku) => (
                  <TableRow key={sku.sku}>
                    <TableCell>
                      <div className="font-mono text-xs">{sku.sku}</div>
                      <div className="text-[10px] text-text-sub truncate max-w-[80px]">{sku.name}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{sku.impressions.toLocaleString()}</div>
                      <div className="text-slate-500">{sku.clicks.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="text-xs">${sku.cpc.toFixed(2)}</TableCell>
                    <TableCell className={`text-xs ${sku.acos > 25 ? 'text-rose-600' : 'text-emerald-600'}`}>{sku.acos.toFixed(1)}%</TableCell>
                    <TableCell className="text-xs">{sku.roas.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{sku.adOrders}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">暂无广告数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
