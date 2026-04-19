import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PlusCircle, DollarSign, ShieldAlert, TrendingUp, ArrowUpRight, Activity, ShoppingCart, Sparkles } from 'lucide-react';
import { SKUStats, FakeOrder, CargoDamage } from '../types';
import { STOCK_HEALTH_THRESHOLD, MXN_TO_CNY, USD_TO_MXN } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
  operationLogs: any[];
  fakeOrders: FakeOrder[];
  cargoDamage: CargoDamage[];
  uiVersion: 'v1' | 'v2';
  onEditSku: (sku: SKUStats | null) => void;
  onAddLog: () => void;
}

export default function Overview() {
  const { skuData, allSkuData, operationLogs, fakeOrders, cargoDamage, uiVersion, onEditSku, onAddLog } = useOutletContext<ContextType>();
  const todayStr = getMexicoDateString();
  const isV2 = uiVersion === 'v2';

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filteredSkuData = useMemo(() => filterByDateRange(allSkuData, startDate, endDate), [allSkuData, startDate, endDate]);
  const filteredFakeOrders = useMemo(() => filterByDateRange(fakeOrders, startDate, endDate), [fakeOrders, startDate, endDate]);
  const filteredCargoDamage = useMemo(() => filterByDateRange(cargoDamage, startDate, endDate), [cargoDamage, startDate, endDate]);

  const metrics = useMemo(() => {
    const byDate: Record<string, { sales: number; orders: number; adSpend: number; profitCNY: number }> = {};
    
    // 1. 处理 SKU 运营数据
    filteredSkuData.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, orders: 0, adSpend: 0, profitCNY: 0 };
      byDate[item.date].sales += item.sales || 0;
      byDate[item.date].orders += item.orders || 0;
      byDate[item.date].adSpend += item.adSpend || 0;
      // 基础净利润 (销售毛利 - 广告)
      byDate[item.date].profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0) - (item.adSpend || 0) * MXN_TO_CNY;
    });

    // 2. 额外支出合计
    const fakeOrderExpense = filteredFakeOrders.reduce((s, item) => 
      s + (item.reviewFeeCNY || 0) - (item.refundAmountUSD || 0) * USD_TO_MXN * MXN_TO_CNY, 0
    );
    const cargoDamageExpense = filteredCargoDamage.reduce((s, item) => 
      s + (item.quantity || 0) * (item.skuValueCNY || 0), 0
    );
    const totalExtraExpense = fakeOrderExpense + cargoDamageExpense;

    const totalSales = filteredSkuData.reduce((s, d) => s + (d.sales || 0), 0);
    const totalOrders = filteredSkuData.reduce((s, d) => s + (d.orders || 0), 0);
    const totalAdSpend = filteredSkuData.reduce((s, d) => s + (d.adSpend || 0), 0);
    
    const totalAdSalesUSD = filteredSkuData.reduce((s, d) => s + ((d.adOrders || 0) * (d.sellingPrice || 0) / USD_TO_MXN), 0);
    const totalSalesUSD = filteredSkuData.reduce((s, d) => s + ((d.orders || 0) * (d.sellingPrice || 0) / USD_TO_MXN), 0);
    const totalAdSpendUSD = totalAdSpend / USD_TO_MXN;
    
    const acos = totalAdSalesUSD > 0 ? (totalAdSpendUSD / totalAdSalesUSD) * 100 : 0;
    const roas = totalAdSpendUSD > 0 ? totalAdSalesUSD / totalAdSpendUSD : 0;
    const tacos = totalSalesUSD > 0 ? (totalAdSpendUSD / totalSalesUSD) * 100 : 0;
    
    const grossProfitCNY = filteredSkuData.reduce((s, d) => s + (d.orders || 0) * (d.unitProfitExclAds || 0), 0);
    // 净利润 = 毛利 - 广告 - 额外支出
    const netProfitCNY = grossProfitCNY - (totalAdSpend * MXN_TO_CNY) - totalExtraExpense;
    const totalSalesCNY = totalSales * MXN_TO_CNY;
    const profitMargin = totalSalesCNY > 0 ? (netProfitCNY / totalSalesCNY) * 100 : 0;

    const chartData = Object.entries(byDate)
      .map(([date, d]) => ({ date, totalSales: d.sales, adSpend: d.adSpend, orders: d.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { totalSales, totalOrders, totalAdSpend, acos, roas, tacos, netProfitCNY, profitMargin, chartData, totalExtraExpense };
  }, [filteredSkuData, filteredFakeOrders, filteredCargoDamage]);

  const isSingleDay = startDate === endDate && startDate;
  const periodLabel = isSingleDay ? `${startDate} 当日` : startDate && endDate ? `${startDate} ~ ${endDate}` : '全部时段';

  const containerVariants: any = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: any = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
      </motion.div>

      <motion.div variants={itemVariants} className={`glass-panel relative overflow-hidden p-0 rounded-2xl flex items-center justify-between shadow-sm border-blue-100 ${isV2 ? 'bg-sky-950/20 border-sky-900/40' : 'bg-sky-50/50'}`}>
        <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${isV2 ? 'from-sky-400 via-indigo-500 to-emerald-500' : 'from-sky-400 to-blue-500'}`} />
        <div className="flex items-center gap-4 px-6 py-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${isV2 ? 'bg-sky-900/50 border border-sky-500/30' : 'bg-white border border-sky-100'}`}>
            <Sparkles className={`w-5 h-5 ${isV2 ? 'text-sky-300 animate-pulse' : 'text-sky-500'}`} />
          </div>
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 tracking-wide font-heading ${isV2 ? 'text-white' : 'text-slate-800'}`}>
              全渠道经营概览
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${isV2 ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-sky-100 text-sky-700 border-sky-200'}`}>{periodLabel}</span>
            </h3>
            <p className={`text-xs mt-0.5 max-w-2xl ${isV2 ? 'text-slate-400' : 'text-slate-600'}`}>
              销售额 <strong className="text-emerald-500">${metrics.totalSales.toLocaleString()} MXN</strong>，
              净利润 <strong className={metrics.netProfitCNY >= 0 ? 'text-emerald-500' : 'text-rose-500'}>¥{metrics.netProfitCNY.toLocaleString(undefined, {minimumFractionDigits:1})} CNY</strong> (已扣除广告、测评或货损支出)。
            </p>
          </div>
        </div>
        <div className="px-6 flex items-center gap-6 border-l h-full py-4 text-xs invisible md:visible border-slate-700/30">
          <div className="flex flex-col text-right">
            <span className="text-slate-500">期间额外支出</span>
            <span className={`font-mono font-bold ${isV2 ? 'text-rose-400' : 'text-rose-500'}`}>¥{metrics.totalExtraExpense.toFixed(1)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-slate-500">活跃 SKU</span>
            <span className="text-sky-500 font-bold">{skuData.length}</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard delay={0} title={`${isSingleDay ? '当日' : '期间'}销售额 (MXN)`} value={`$${metrics.totalSales.toLocaleString()}`} icon={DollarSign} color="text-emerald-400" bg="from-emerald-500/20 to-transparent" />
        <StatCard delay={0.1} title={`${isSingleDay ? '当日' : '期间'}订单`} value={`${metrics.totalOrders}`} icon={ShoppingCart} color="text-sky-400" bg="from-sky-500/20 to-transparent" />
        <StatCard delay={0.2} title={`${isSingleDay ? '当日' : '期间'}净利润 (CNY)`} value={`¥${metrics.netProfitCNY.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})}`} icon={ShieldAlert} color="text-indigo-400" bg="from-indigo-500/20 to-transparent" subtitle="扣除测评/货损后" />
        <StatCard delay={0.3} title={`${isSingleDay ? '当日' : '期间'}广告费 (MXN)`} value={`$${metrics.totalAdSpend.toLocaleString()}`} icon={TrendingUp} color="text-amber-400" bg="from-amber-500/20 to-transparent" />
        <StatCard delay={0.4} title="整体 ACOS" value={`${metrics.acos.toFixed(1)}%`} icon={ArrowUpRight} color="text-purple-400" bg="from-purple-500/20 to-transparent" subtitle="基于广告订单" />
        <StatCard delay={0.5} title="全店 TACOS" value={`${metrics.tacos.toFixed(1)}%`} icon={Activity} color="text-rose-400" bg="from-rose-500/20 to-transparent" subtitle="占总营收比" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants as any} className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`font-bold font-heading ${isV2 ? 'text-white' : 'text-slate-800'}`}>销售与广告表现</h3>
              <p className="text-slate-500 text-xs mt-1">{periodLabel} · 每日汇总</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 text-slate-400"><div className="w-2.5 h-2.5 rounded bg-sky-500" />销售额</div>
              <div className="flex items-center gap-2 text-slate-400"><div className="w-2.5 h-2.5 rounded bg-amber-400" />广告费</div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={isV2 ? 0.4 : 0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isV2 ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => val.split('-').slice(1).join('/')} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isV2 ? '#0f172a' : '#fff', 
                      borderRadius: '12px', 
                      border: isV2 ? '1px solid #334155' : '1px solid #e2e8f0', 
                      fontSize: '12px', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      color: isV2 ? '#f1f5f9' : '#0f172a'
                    }}
                    itemStyle={{ color: isV2 ? '#38bdf8' : '#0ea5e9' }}
                  />
                  <Area type="monotone" dataKey="totalSales" name="销售额 (MXN)" stroke={isV2 ? '#38bdf8' : '#0ea5e9'} fill="url(#colorSales)" strokeWidth={3} />
                  <Area type="monotone" dataKey="adSpend" name="广告费 (MXN)" stroke="#fbbf24" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">所选日期范围内暂无数据</div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants as any} className="lg:col-span-1 glass-card rounded-2xl flex flex-col p-0 overflow-hidden">
          <div className={`p-5 border-b flex items-center justify-between ${isV2 ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
            <h3 className={`font-bold font-heading ${isV2 ? 'text-white' : 'text-slate-800'}`}>近期运营记录</h3>
            <button onClick={onAddLog} className="text-slate-400 hover:text-sky-500 transition-colors"><PlusCircle className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {(operationLogs || []).slice(0, 8).map((log, idx) => {
              const actionPart = log.action || '';
              const isPrice = actionPart.includes('[Price]');
              const isAds = actionPart.includes('[Ads]');
              const isStock = actionPart.includes('[Stock]');
              
              return (
                <div key={log.id || idx} className={`p-3 mb-2 rounded-xl transition-all border flex items-start gap-3 relative border-transparent ${isV2 ? 'hover:bg-slate-800/40 hover:border-slate-700/50' : 'hover:border-slate-100'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 z-10 ${
                    isPrice ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                    isAds ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 
                    isStock ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-slate-500/10 border-slate-500/20 text-slate-400'
                  }`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">{log.date}</span>
                       <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isV2 ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>SKU: {log.sku}</span>
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isV2 ? 'text-slate-300' : 'text-slate-700'}`}>
                      {actionPart.replace(/\[.*?\]\s*/, '')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants as any} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium tracking-wide">综合净利润率</span>
          <span className={`text-lg font-bold ${metrics.profitMargin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{metrics.profitMargin.toFixed(1)}%</span>
        </motion.div>
        <motion.div variants={itemVariants as any} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium tracking-wide">ROAS</span>
          <span className="text-lg font-bold text-sky-400">{metrics.roas.toFixed(2)}</span>
        </motion.div>
        <motion.div variants={itemVariants as any} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium tracking-wide">库存健康度</span>
          <span className="text-lg font-bold text-amber-500">{skuData.length > 0 ? `${Math.min(100, Math.floor((1 - skuData.filter(s => (s.stock || 0) < (s.avgSalesSinceListing || 1) * STOCK_HEALTH_THRESHOLD).length / skuData.length) * 100))}%` : 'N/A'}</span>
        </motion.div>
        <motion.div variants={itemVariants as any} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium tracking-wide">费用覆盖天数</span>
          <span className="text-lg font-bold text-slate-400">{metrics.chartData.length}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, delay, subtitle }: any) {
  return (
    <motion.div variants={{hidden: {y:20, opacity:0}, visible: {y:0, opacity:1, transition: {delay}}} as any} className="stat-card group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bg} rounded-bl-full opacity-10 -z-10 transition-transform group-hover:scale-110`} />
      <div className="stat-label flex flex-col items-start gap-0.5">
        <span className="group-hover:text-sky-400 transition-colors">{title}</span>
        {subtitle && <span className="text-[9px] text-slate-400 font-normal lowercase">{subtitle}</span>}
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-sm"><Icon className={`w-4 h-4 ${color}`} /></div>
      <div className="stat-value mt-2 group-hover:scale-105 transition-transform origin-left">{value}</div>
    </motion.div>
  );
}
