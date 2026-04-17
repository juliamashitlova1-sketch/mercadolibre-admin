import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SKUStats } from '../types';
import { MXN_TO_CNY } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
}

export default function Finance() {
  const { skuData, allSkuData } = useOutletContext<ContextType>();
  const todayStr = getMexicoDateString();

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filtered = useMemo(() => filterByDateRange(allSkuData, startDate, endDate), [allSkuData, startDate, endDate]);

  const { dailyFinance, totalProfitCNY, totalSalesCNY } = useMemo(() => {
    const byDate: Record<string, { sales: number; adSpend: number; orders: number; profitCNY: number }> = {};
    filtered.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, adSpend: 0, orders: 0, profitCNY: 0 };
      byDate[item.date].sales += item.sales || 0;
      byDate[item.date].adSpend += item.adSpend || 0;
      byDate[item.date].orders += item.orders || 0;
      byDate[item.date].profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0);
    });
    const sorted = Object.entries(byDate)
      .map(([date, d]) => ({
        date, sales: d.sales, adSpend: d.adSpend, orders: d.orders,
        profitCNY: d.profitCNY - d.adSpend * MXN_TO_CNY,
        salesCNY: d.sales * MXN_TO_CNY,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const tProfit = sorted.reduce((s, d) => s + d.profitCNY, 0);
    const tSales = sorted.reduce((s, d) => s + d.salesCNY, 0);
    return { dailyFinance: sorted, totalProfitCNY: tProfit, totalSalesCNY: tSales };
  }, [filtered]);

  const isSingleDay = startDate === endDate && startDate;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">财务与结算台账</h2>
        <p className="text-slate-500 text-sm">从 SKU 运营数据自动聚合的逐日盈亏核算</p>
      </header>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">{isSingleDay ? '当日' : '累计'}净利润</div>
          <div className="stat-value text-emerald-600">¥{totalProfitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-xs font-normal text-slate-500">CNY</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均利润率</div>
          <div className="stat-value">{totalSalesCNY > 0 ? ((totalProfitCNY / totalSalesCNY) * 100).toFixed(1) : '0'}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">汇率 (MXN/CNY)</div>
          <div className="stat-value text-sky-500">{MXN_TO_CNY}</div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">每日财务明细 (自动聚合)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>总销售额 (MXN)</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead>广告消耗 (MXN)</TableHead>
                <TableHead>预估净利润 (CNY)</TableHead>
                <TableHead>利润率</TableHead>
                <TableHead className="text-right">来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyFinance.length > 0 ? dailyFinance.map((day) => {
                const margin = day.salesCNY > 0 ? (day.profitCNY / day.salesCNY) * 100 : 0;
                return (
                  <TableRow key={day.date}>
                    <TableCell className="text-xs font-mono">{day.date}</TableCell>
                    <TableCell className="text-xs font-medium">${day.sales.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{day.orders}</TableCell>
                    <TableCell className="text-xs text-rose-500">-${day.adSpend.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${day.profitCNY > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ¥{day.profitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </TableCell>
                    <TableCell className="text-xs">{margin.toFixed(1)}%</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="text-[9px]">SKU聚合</Badge></TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">所选日期范围内暂无数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
