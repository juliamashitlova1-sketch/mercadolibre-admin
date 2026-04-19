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

  const { dailyFinance, skuFinance, totalProfitCNY, totalSalesCNY } = useMemo(() => {
    const byDate: Record<string, { sales: number; adSpend: number; orders: number; profitCNY: number }> = {};
    const bySku: Record<string, { sku: string; name: string; sales: number; adSpend: number; orders: number; profitCNY: number; imageUrl?: string }> = {};

    filtered.forEach(item => {
      // 逐日聚合
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, adSpend: 0, orders: 0, profitCNY: 0 };
      byDate[item.date].sales += item.sales || 0;
      byDate[item.date].adSpend += item.adSpend || 0;
      byDate[item.date].orders += item.orders || 0;
      byDate[item.date].profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0);

      // 按 SKU 聚合
      const skuKey = item.sku || 'UNATTRIBUTED';
      if (!bySku[skuKey]) {
        bySku[skuKey] = { 
          sku: skuKey, 
          name: item.skuName || (item.sku ? item.sku : '未归属广告/其它支出'), 
          sales: 0, adSpend: 0, orders: 0, profitCNY: 0,
          imageUrl: item.imageUrl
        };
      }
      const s = bySku[skuKey];
      s.sales += item.sales || 0;
      s.adSpend += item.adSpend || 0;
      s.orders += item.orders || 0;
      // 利润计算: 订单数 * 单件人民币利润 - 广告消耗 * 汇率
      s.profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0) - (item.adSpend || 0) * MXN_TO_CNY;
    });

    const dailySorted = Object.entries(byDate)
      .map(([date, d]) => ({
        date, sales: d.sales, adSpend: d.adSpend, orders: d.orders,
        profitCNY: d.profitCNY - d.adSpend * MXN_TO_CNY,
        salesCNY: d.sales * MXN_TO_CNY,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const skuSorted = Object.values(bySku)
      .sort((a, b) => b.profitCNY - a.profitCNY);

    const tProfit = dailySorted.reduce((s, d) => s + d.profitCNY, 0);
    const tSales = dailySorted.reduce((s, d) => s + d.salesCNY, 0);

    return { 
      dailyFinance: dailySorted, 
      skuFinance: skuSorted,
      totalProfitCNY: tProfit, 
      totalSalesCNY: tSales 
    };
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：每日汇总 */}
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 bg-sky-500 rounded-full"></div>
              每日财务明细
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">日期</TableHead>
                  <TableHead className="text-[11px] font-bold">销售额 (MXN)</TableHead>
                  <TableHead className="text-[11px] font-bold">广告 (MXN)</TableHead>
                  <TableHead className="text-[11px] font-bold">净利润 (CNY)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyFinance.length > 0 ? dailyFinance.map((day) => (
                  <TableRow key={day.date} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs font-mono py-3">{day.date}</TableCell>
                    <TableCell className="text-xs font-medium">${day.sales.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-rose-500">-${day.adSpend.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${day.profitCNY > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ¥{day.profitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 text-sm">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 右侧：按 SKU 汇总 */}
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
              SKU 利润贡献排行
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">SKU</TableHead>
                  <TableHead className="text-[11px] font-bold">销量</TableHead>
                  <TableHead className="text-[11px] font-bold">广告 (MXN)</TableHead>
                  <TableHead className="text-[11px] font-bold">净利润 (CNY)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuFinance.length > 0 ? skuFinance.map((item) => (
                  <TableRow key={item.sku} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-3">
                      <div className="text-xs font-mono font-bold text-slate-700">{item.sku}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.name}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{item.orders}</TableCell>
                    <TableCell className="text-xs text-rose-400">-${item.adSpend.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${item.profitCNY > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ¥{item.profitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 text-sm">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
