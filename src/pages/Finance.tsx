import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SKUStats, FakeOrder, CargoDamage } from '../types';
import { MXN_TO_CNY, USD_TO_MXN } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
  fakeOrders: FakeOrder[];
  cargoDamage: CargoDamage[];
  uiVersion: 'v1' | 'v2';
}

export default function Finance() {
  const { allSkuData, fakeOrders, cargoDamage, uiVersion } = useOutletContext<ContextType>();
  const isV2 = uiVersion === 'v2';
  const todayStr = getMexicoDateString();

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filteredSkuData = useMemo(() => filterByDateRange(allSkuData, startDate, endDate), [allSkuData, startDate, endDate]);
  const filteredFakeOrders = useMemo(() => filterByDateRange(fakeOrders, startDate, endDate), [fakeOrders, startDate, endDate]);
  const filteredCargoDamage = useMemo(() => filterByDateRange(cargoDamage, startDate, endDate), [cargoDamage, startDate, endDate]);

  const { dailyFinance, skuFinance, totalProfitCNY, totalSalesCNY } = useMemo(() => {
    const byDate: Record<string, { sales: number; adSpend: number; orders: number; profitCNY: number; expenseCNY: number }> = {};
    const bySku: Record<string, { sku: string; name: string; sales: number; adSpend: number; orders: number; adOrders: number; profitCNY: number; expenseCNY: number; imageUrl?: string }> = {};

    // 1. 处理 SKU 运营数据 (销售与广告)
    filteredSkuData.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, adSpend: 0, orders: 0, profitCNY: 0, expenseCNY: 0 };
      byDate[item.date].sales += item.sales || 0;
      byDate[item.date].adSpend += item.adSpend || 0;
      byDate[item.date].orders += item.orders || 0;
      // 毛利 (不含广告): 订单 * 单件毛利
      byDate[item.date].profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0);

      const skuKey = item.sku || 'UNATTRIBUTED';
      if (!bySku[skuKey]) {
        bySku[skuKey] = { 
          sku: skuKey, 
          name: item.skuName || (item.sku ? item.sku : '未归属广告/其它支出'), 
          sales: 0, adSpend: 0, orders: 0, adOrders: 0, profitCNY: 0, expenseCNY: 0,
          imageUrl: item.imageUrl
        };
      }
      const s = bySku[skuKey];
      s.sales += item.sales || 0;
      s.adSpend += item.adSpend || 0;
      s.orders += item.orders || 0;
      s.adOrders += item.adOrders || 0;
      // SKU 利润: 订单 * 单件毛利 - 广告支出(换算)
      s.profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0) - (item.adSpend || 0) * MXN_TO_CNY;
    });

    // 2. 处理刷单支出
    filteredFakeOrders.forEach(item => {
      const cost = (item.reviewFeeCNY || 0) - (item.refundAmountUSD || 0) * USD_TO_MXN * MXN_TO_CNY;
      
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, adSpend: 0, orders: 0, profitCNY: 0, expenseCNY: 0 };
      byDate[item.date].expenseCNY += cost;

      const skuKey = item.sku || 'FAKE_ORDER';
      if (!bySku[skuKey]) {
        bySku[skuKey] = { sku: skuKey, name: item.skuName || '刷单/测评', sales: 0, adSpend: 0, orders: 0, adOrders: 0, profitCNY: 0, expenseCNY: 0 };
      }
      bySku[skuKey].expenseCNY += cost;
    });

    // 3. 处理货损支出
    filteredCargoDamage.forEach(item => {
      const cost = (item.quantity || 0) * (item.skuValueCNY || 0);
      
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, adSpend: 0, orders: 0, profitCNY: 0, expenseCNY: 0 };
      byDate[item.date].expenseCNY += cost;

      const skuKey = item.sku || 'CARGO_DAMAGE';
      if (!bySku[skuKey]) {
        bySku[skuKey] = { sku: skuKey, name: item.skuName || '货损异常', sales: 0, adSpend: 0, orders: 0, adOrders: 0, profitCNY: 0, expenseCNY: 0 };
      }
      bySku[skuKey].expenseCNY += cost;
    });

    const dailySorted = Object.entries(byDate)
      .map(([date, d]) => ({
        date, 
        sales: d.sales, 
        adSpend: d.adSpend, 
        orders: d.orders,
        // 最终净利润 = 毛利 - 广告支出 - 额外支出(刷单+货损)
        profitCNY: d.profitCNY - (d.adSpend * MXN_TO_CNY) - d.expenseCNY,
        salesCNY: d.sales * MXN_TO_CNY,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const skuSorted = Object.values(bySku)
      .map(s => ({
        ...s,
        // SKU 净利润 = (基础毛利-广告) - 额外支出
        profitCNY: s.profitCNY - s.expenseCNY
      }))
      .sort((a, b) => b.profitCNY - a.profitCNY);

    const tProfit = dailySorted.reduce((s, d) => s + d.profitCNY, 0);
    const tSales = dailySorted.reduce((s, d) => s + d.salesCNY, 0);

    return { 
      dailyFinance: dailySorted, 
      skuFinance: skuSorted,
      totalProfitCNY: tProfit, 
      totalSalesCNY: tSales 
    };
  }, [filteredSkuData, filteredFakeOrders, filteredCargoDamage]);

  const isSingleDay = startDate === endDate && startDate;

  return (
    <div className="flex flex-col gap-6 p-2">
      <header className="flex flex-col gap-1">
        <h2 className={`text-2xl font-black tracking-tight ${isV2 ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'text-slate-800'}`}>财务与结算台账</h2>
        <p className={`text-sm ${isV2 ? 'text-slate-400' : 'text-slate-500'}`}>已统筹 SKU 运营、广告、刷单及货损的综合盈亏核算</p>
      </header>

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`glass-card p-6 rounded-2xl flex flex-col justify-between ${isV2 ? 'bg-emerald-500/5 border-emerald-500/20' : ''}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isV2 ? 'text-emerald-400' : 'text-slate-400'}`}>{isSingleDay ? '当日' : '期间'}净利润</div>
          <div className={`text-2xl font-black ${totalProfitCNY >= 0 ? (isV2 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-emerald-600') : (isV2 ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]' : 'text-rose-600')}`}>
            ¥{totalProfitCNY.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold opacity-40 ml-1.5 uppercase tracking-tighter">CNY</span>
          </div>
        </div>
        <div className={`glass-card p-6 rounded-2xl flex flex-col justify-between ${isV2 ? 'bg-indigo-500/5 border-indigo-500/20' : ''}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isV2 ? 'text-indigo-400' : 'text-slate-400'}`}>平均净利润率</div>
          <div className={`text-2xl font-black ${isV2 ? 'text-white' : 'text-slate-800'}`}>
            {totalSalesCNY > 0 ? ((totalProfitCNY / totalSalesCNY) * 100).toFixed(1) : '0'}%
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">关键币种汇率</div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-black">MXN:CNY</span>
              <span className="text-xl font-bold text-sky-400">{MXN_TO_CNY}</span>
             </div>
             <div className="w-px h-8 bg-slate-700/30"></div>
             <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-black">USD:MXN</span>
              <span className="text-xl font-bold text-indigo-400">{USD_TO_MXN}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={`border-none shadow-2xl rounded-xl overflow-hidden ${isV2 ? 'bg-[#1e293b]/40 backdrop-blur-xl border border-white/5' : 'bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-slate-100 border-slate-100'}`}>
          <CardHeader className={`pb-3 border-b ${isV2 ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/30 border-slate-50'}`}>
            <CardTitle className={`text-sm font-bold flex items-center gap-2 ${isV2 ? 'text-white' : 'text-slate-700'}`}>
              <div className={`w-1.5 h-4 rounded-full ${isV2 ? 'bg-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]' : 'bg-sky-500'}`}></div>
              逐日净利润明细 (已含额外支出)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className={`${isV2 ? 'bg-[#0f172a]/80 sticky top-0 z-10 backdrop-blur-md' : 'bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm'}`}>
                <TableRow className={isV2 ? 'border-slate-800 hover:bg-transparent' : ''}>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>日期</TableHead>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>销售额 (MXN)</TableHead>
                  <TableHead className={`text-[10px] font-bold text-right ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>净利润 (CNY)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyFinance.length > 0 ? dailyFinance.map((day) => (
                  <TableRow key={day.date} className={`${isV2 ? 'border-slate-800/50 hover:bg-sky-500/5' : 'hover:bg-slate-50/50'} transition-all duration-300`}>
                    <TableCell className={`text-[11px] font-mono font-bold py-3 ${isV2 ? 'text-slate-400' : 'text-slate-500'}`}>{day.date}</TableCell>
                    <TableCell className={`text-[11px] font-bold ${isV2 ? 'text-slate-300' : 'text-slate-800'}`}>${day.sales.toLocaleString()}</TableCell>
                    <TableCell className={`text-[11px] font-black text-right ${day.profitCNY > 0 ? (isV2 ? 'text-emerald-400' : 'text-emerald-600') : (isV2 ? 'text-rose-400' : 'text-rose-600')}`}>
                      ¥{day.profitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs">暂无财务数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-2xl rounded-xl overflow-hidden ${isV2 ? 'bg-[#1e293b]/40 backdrop-blur-xl border border-white/5' : 'bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-slate-100 border-slate-100'}`}>
          <CardHeader className={`pb-3 border-b ${isV2 ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/30 border-slate-50'}`}>
            <CardTitle className={`text-sm font-bold flex items-center gap-2 ${isV2 ? 'text-white' : 'text-slate-700'}`}>
              <div className={`w-1.5 h-4 rounded-full ${isV2 ? 'bg-indigo-400 drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]' : 'bg-indigo-500'}`}></div>
              SKU 真实盈亏排行 (扣除测评货损)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className={`${isV2 ? 'bg-[#0f172a]/80 sticky top-0 z-10 backdrop-blur-md' : 'bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm'}`}>
                <TableRow className={isV2 ? 'border-slate-800 hover:bg-transparent' : ''}>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>产品</TableHead>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>SKU</TableHead>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>销量/费用</TableHead>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>广告销量</TableHead>
                  <TableHead className={`text-[10px] font-bold ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>自然销量</TableHead>
                  <TableHead className={`text-[10px] font-bold text-right ${isV2 ? 'text-slate-500' : 'text-slate-400'}`}>净利润 (CNY)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuFinance.length > 0 ? skuFinance.map((item) => (
                  <TableRow key={item.sku} className={`${isV2 ? 'border-slate-800/50 hover:bg-indigo-500/5' : 'hover:bg-slate-50/50'} transition-all duration-300 group`}>
                    <TableCell className="py-3">
                      <div className={`text-[10px] font-medium leading-normal ${isV2 ? 'text-slate-400' : 'text-slate-500'}`}>{item.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-[11px] font-bold ${isV2 ? 'text-slate-200 group-hover:text-sky-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>{item.sku}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-[11px] font-bold ${isV2 ? 'text-slate-400' : 'text-slate-600'}`}>{item.orders} 件</div>
                      {item.expenseCNY > 0 && <div className={`text-[9px] font-bold ${isV2 ? 'text-rose-400/80' : 'text-rose-400'}`}>额外支出: ¥{item.expenseCNY.toFixed(1)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className={`text-[11px] font-medium ${isV2 ? 'text-sky-400/80' : 'text-sky-600'}`}>{item.adOrders}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-[11px] font-medium ${isV2 ? 'text-emerald-400/80' : 'text-emerald-600'}`}>{item.orders - item.adOrders}</div>
                    </TableCell>
                    <TableCell className={`text-[11px] font-black text-right ${item.profitCNY > 0 ? (isV2 ? 'text-emerald-400' : 'text-emerald-600') : (isV2 ? 'text-rose-400' : 'text-rose-600')}`}>
                      ¥{item.profitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
