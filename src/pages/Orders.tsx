import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
}

export default function Orders() {
  const { skuData, allSkuData } = useOutletContext<ContextType>();
  const todayStr = getMexicoDateString();

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filtered = useMemo(() => filterByDateRange(allSkuData, startDate, endDate), [allSkuData, startDate, endDate]);

  const metrics = useMemo(() => {
    const totalOrders = filtered.reduce((s, d) => s + (d.orders || 0), 0);
    const totalSales = filtered.reduce((s, d) => s + (d.sales || 0), 0);
    const aov = totalOrders > 0 ? totalSales / totalOrders : 0;

    // 按SKU汇总
    const bySku: Record<string, { orders: number; sales: number; name: string }> = {};
    filtered.forEach(item => {
      if (!bySku[item.sku]) bySku[item.sku] = { orders: 0, sales: 0, name: item.skuName || '' };
      bySku[item.sku].orders += item.orders || 0;
      bySku[item.sku].sales += item.sales || 0;
    });
    const skuBreakdown = Object.entries(bySku)
      .map(([sku, d]) => ({ sku, ...d }))
      .sort((a, b) => b.orders - a.orders);

    return { totalOrders, totalSales, aov, skuBreakdown };
  }, [filtered]);

  const isSingleDay = startDate === endDate && startDate;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">订单与销售明细</h2>
        <p className="text-text-sub text-sm">追踪订单总量、单品出单分布及销售转化</p>
      </header>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">{isSingleDay ? '当日' : '累计'}订单量</div>
          <div className="stat-value">{metrics.totalOrders} <span className="text-xs font-normal text-text-sub">单</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isSingleDay ? '当日' : '平均'}客单价 (AOV)</div>
          <div className="stat-value text-primary">${metrics.aov.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isSingleDay ? '当日' : '累计'}销售额 (MXN)</div>
          <div className="stat-value text-emerald-600">${metrics.totalSales.toLocaleString()}</div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">单品订单分布</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>SKU (名称)</TableHead>
                <TableHead>订单数量</TableHead>
                <TableHead>销售额 (MXN)</TableHead>
                <TableHead>占比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.skuBreakdown.length > 0 ? metrics.skuBreakdown.map(item => (
                <TableRow key={item.sku}>
                  <TableCell>
                    <div className="font-mono text-xs font-bold">{item.sku}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{item.name}</div>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{item.orders}</TableCell>
                  <TableCell className="text-xs">${item.sales.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{metrics.totalOrders > 0 ? ((item.orders / metrics.totalOrders) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 text-sm">所选日期范围内暂无订单数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
