import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PlusCircle, DollarSign, ShieldAlert, TrendingUp, ArrowUpRight, Package, Sparkles, Activity, ShoppingCart } from 'lucide-react';
import { SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD, MXN_TO_CNY, USD_TO_MXN } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
  operationLogs: any[];
  onEditSku: (sku: SKUStats | null) => void;
  onAddLog: () => void;
}

export default function Overview() {
  const { skuData, allSkuData, operationLogs, onEditSku, onAddLog } = useOutletContext<ContextType>();
  const todayStr = getMexicoDateString();

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // 按日期范围筛选
  const filtered = useMemo(() => filterByDateRange(allSkuData, startDate, endDate), [allSkuData, startDate, endDate]);

  // --- 从筛选后数据聚合指标 ---
  const metrics = useMemo(() => {
    // 按日期分组，取每个 SKU 每天的快照
    const byDate: Record<string, { sales: number; orders: number; adSpend: number; profitCNY: number }> = {};
    filtered.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { sales: 0, orders: 0, adSpend: 0, profitCNY: 0 };
      byDate[item.date].sales += item.sales || 0;
      byDate[item.date].orders += item.orders || 0;
      byDate[item.date].adSpend += item.adSpend || 0;
      byDate[item.date].profitCNY += (item.orders || 0) * (item.unitProfitExclAds || 0);
    });

    const totalSales = filtered.reduce((s, d) => s + (d.sales || 0), 0);
    const totalOrders = filtered.reduce((s, d) => s + (d.orders || 0), 0);
    const totalAdSpend = filtered.reduce((s, d) => s + (d.adSpend || 0), 0); // MXN
    
    // 核心修正：ACOS/ROAS 基于广告产生的销售额计算，TACOS 基于全店总销额
    const totalAdSalesUSD = filtered.reduce((s, d) => s + ((d.adOrders || 0) * (d.sellingPrice || 0) / USD_TO_MXN), 0);
    const totalSalesUSD = filtered.reduce((s, d) => s + ((d.orders || 0) * (d.sellingPrice || 0) / USD_TO_MXN), 0);
    const totalAdSpendUSD = totalAdSpend / USD_TO_MXN;
    
    const acos = totalAdSalesUSD > 0 ? (totalAdSpendUSD / totalAdSalesUSD) * 100 : 0;
    const roas = totalAdSpendUSD > 0 ? totalAdSalesUSD / totalAdSpendUSD : 0;
    const tacos = totalSalesUSD > 0 ? (totalAdSpendUSD / totalSalesUSD) * 100 : 0;
    
    const grossProfitCNY = filtered.reduce((s, d) => s + (d.orders || 0) * (d.unitProfitExclAds || 0), 0);
    const adSpendCNY = totalAdSpend * MXN_TO_CNY;
    const netProfitCNY = grossProfitCNY - adSpendCNY;
    const totalSalesCNY = totalSales * MXN_TO_CNY;
    const profitMargin = totalSalesCNY > 0 ? (netProfitCNY / totalSalesCNY) * 100 : 0;

    // 图表数据
    const chartData = Object.entries(byDate)
      .map(([date, d]) => ({ date, totalSales: d.sales, adSpend: d.adSpend, orders: d.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { totalSales, totalOrders, totalAdSpend, acos, roas, tacos, netProfitCNY, profitMargin, chartData };
  }, [filtered]);

  const isSingleDay = startDate === endDate && startDate;
  const periodLabel = isSingleDay ? `${startDate} 当日` : startDate && endDate ? `${startDate} ~ ${endDate}` : '全部时段';

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* 日期筛选器 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
      </motion.div>

      {/* AI Briefing */}
      <motion.div variants={itemVariants} className="glass-panel relative overflow-hidden p-0 rounded-2xl flex items-center justify-between shadow-sm border-blue-100 bg-sky-50/50">
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-10 h-10 rounded-full bg-white border border-sky-100 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <h3 className="text-slate-800 text-sm font-bold flex items-center gap-2 tracking-wide font-heading">
              数据概览
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-mono border border-sky-200">{periodLabel}</span>
            </h3>
            <p className="text-slate-600 text-xs mt-0.5 max-w-2xl">
              销售额 <strong className="text-emerald-600">${metrics.totalSales.toLocaleString()} MXN</strong>，
              共 <strong>{metrics.totalOrders}</strong> 个订单，
              TACOS <strong className={metrics.tacos > 15 ? 'text-amber-500' : 'text-emerald-600'}>{metrics.tacos.toFixed(1)}%</strong>
            </p>
          </div>
        </div>
        <div className="px-6 flex items-center gap-6 border-l border-slate-200 h-full py-4 text-xs">
          <div className="flex flex-col text-right">
            <span className="text-slate-500">MXN/CNY</span>
            <span className="font-mono text-slate-800 font-bold">{MXN_TO_CNY}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-slate-500">活跃 SKU</span>
            <span className="text-sky-600 font-bold">{skuData.length}</span>
          </div>
        </div>
      </motion.div>

      {/* 6 大指标卡 */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard delay={0} title={`${isSingleDay ? '当日' : '累计'}销售额 (MXN)`} value={`$${metrics.totalSales.toLocaleString()}`} icon={DollarSign} color="text-emerald-400" bg="from-emerald-500/20 to-transparent" />
        <StatCard delay={0.1} title={`${isSingleDay ? '当日' : '累计'}订单`} value={`${metrics.totalOrders}`} icon={ShoppingCart} color="text-sky-400" bg="from-sky-500/20 to-transparent" />
        <StatCard delay={0.2} title={`${isSingleDay ? '当日' : '累计'}净利润 (CNY)`} value={`¥${metrics.netProfitCNY.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`} icon={ShieldAlert} color="text-indigo-400" bg="from-indigo-500/20 to-transparent" />
        <StatCard delay={0.3} title={`${isSingleDay ? '当日' : '累计'}广告费 (MXN)`} value={`$${metrics.totalAdSpend.toLocaleString()}`} icon={TrendingUp} color="text-amber-400" bg="from-amber-500/20 to-transparent" />
        <StatCard delay={0.4} title="整体 ACOS" value={`${metrics.acos.toFixed(1)}%`} icon={ArrowUpRight} color="text-purple-400" bg="from-purple-500/20 to-transparent" subtitle="基于广告订单" />
        <StatCard delay={0.5} title="全店 TACOS" value={`${metrics.tacos.toFixed(1)}%`} icon={Activity} color="text-rose-400" bg="from-rose-500/20 to-transparent" subtitle="占总营收比" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 趋势图 */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-slate-800 font-bold font-heading">销售与广告表现</h3>
              <p className="text-slate-500 text-xs mt-1">{periodLabel} · 每日汇总</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 text-slate-600"><div className="w-2.5 h-2.5 rounded bg-sky-500" />销售额</div>
              <div className="flex items-center gap-2 text-slate-600"><div className="w-2.5 h-2.5 rounded bg-amber-400" />广告费</div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => val.split('-').slice(1).join('/')} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="totalSales" name="销售额 (MXN)" stroke="#0ea5e9" fill="url(#colorSales)" strokeWidth={3} />
                  <Area type="monotone" dataKey="adSpend" name="广告费 (MXN)" stroke="#fbbf24" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">所选日期范围内暂无数据</div>
            )}
          </div>
        </motion.div>

        {/* 操作日志面板 */}
        <motion.div variants={itemVariants} className="lg:col-span-1 glass-card rounded-2xl flex flex-col p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-slate-800 font-bold font-heading">近期运营记录</h3>
            <button onClick={onAddLog} className="text-slate-400 hover:text-sky-500 transition-colors"><PlusCircle className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {(operationLogs || []).slice(0, 8).map((log, idx) => {
              const datePart = log.date;
              const actionPart = log.action || '';
              // Try to extract icons or colors based on action type string like [Price]
              const isPrice = actionPart.includes('[Price]');
              const isAds = actionPart.includes('[Ads]');
              const isStock = actionPart.includes('[Stock]');
              
              return (
                <div key={log.id || idx} className="p-3 mb-2 rounded-xl transition-all border border-transparent hover:border-slate-100 flex items-start gap-3 relative">
                  {idx < (operationLogs.length - 1) && (
                    <div className="absolute left-[25px] top-10 bottom-[-10px] w-px bg-slate-100" />
                  )}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 z-10 ${
                    isPrice ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 
                    isAds ? 'bg-sky-50 border-sky-100 text-sky-500' : 
                    isStock ? 'bg-amber-50 border-amber-100 text-amber-500' :
                    'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{datePart}</span>
                       <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">SKU: {log.sku}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2 leading-relaxed">
                      {actionPart.replace(/\[.*?\]\s*/, '')}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`text-[9px] font-bold px-1.5 rounded-full border ${
                        isPrice ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 
                        isAds ? 'border-sky-200 text-sky-600 bg-sky-50' : 
                        isStock ? 'border-amber-200 text-amber-600 bg-amber-50' :
                        'border-slate-200 text-slate-500 bg-slate-50'
                      }`}>
                        {actionPart.match(/\[(.*?)\]/)?.[1] || '其他'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {(!operationLogs || operationLogs.length === 0) && (
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 text-xs text-balance">暂无运营记录。点击右上角“+”号添加您的第一条动作记录。</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* 底部摘要 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">利润率</span>
          <span className="text-lg font-bold text-emerald-600">{metrics.profitMargin.toFixed(1)}%</span>
        </motion.div>
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">ROAS</span>
          <span className="text-lg font-bold text-sky-600">{metrics.roas.toFixed(2)}</span>
        </motion.div>
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">库存健康度</span>
          <span className="text-lg font-bold text-amber-600">{skuData.length > 0 ? `${Math.min(100, Math.floor((1 - skuData.filter(s => s.stock < (s.avgSalesSinceListing || 1) * STOCK_HEALTH_THRESHOLD).length / skuData.length) * 100))}%` : 'N/A'}</span>
        </motion.div>
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">数据覆盖天数</span>
          <span className="text-lg font-bold text-slate-600">{metrics.chartData.length}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, delay, subtitle }: any) {
  return (
    <motion.div variants={{hidden: {y:20, opacity:0}, visible: {y:0, opacity:1, transition: {delay}}}} className="stat-card group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bg} rounded-bl-full opacity-10 -z-10 transition-transform group-hover:scale-110`} />
      <div className="stat-label flex flex-col items-start gap-0.5">
        <span className="text-slate-500">{title}</span>
        {subtitle && <span className="text-[9px] text-slate-400 font-normal lowercase">{subtitle}</span>}
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm"><Icon className={`w-4 h-4 ${color}`} /></div>
      <div className="stat-value text-slate-800 mt-2">{value}</div>
    </motion.div>
  );
}
