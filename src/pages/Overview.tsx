import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, PlusCircle, DollarSign, ShieldAlert, TrendingUp, ArrowUpRight, Package, Sparkles, Activity, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { DailyStats, SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';

interface ContextType {
  dailyData: DailyStats[];
  skuData: SKUStats[];
  onOpenDataEntry: () => void;
  onEditSku: (sku: SKUStats | null) => void;
}

export default function Overview() {
  const { dailyData, skuData, onEditSku } = useOutletContext<ContextType>();
  const [mexicoTime, setMexicoTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Mexico_City',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      };
      setMexicoTime(new Intl.DateTimeFormat('en-GB', options).format(new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const latestStats = dailyData[dailyData.length - 1] || {
    date: format(new Date(), 'yyyy-MM-dd'),
    totalSales: 0, totalOrders: 0, adSpend: 0, exchangeRate: 0,
    questions: 0, claims: 0, reputation: 'green' as const
  };
  const prevStats = dailyData[dailyData.length - 2] || {
    date: '', totalSales: 1, totalOrders: 1, adSpend: 0, exchangeRate: 0,
    questions: 0, claims: 0, reputation: 'green' as const
  };

  const calculateMetrics = (stats: DailyStats, skus: SKUStats[]) => {
    const aov = stats.totalSales / (stats.totalOrders || 1);
    const acos = stats.adSpend / (stats.totalSales || 1);
    const tacos = stats.adSpend / (stats.totalSales || 1);
    const roas = stats.totalSales / (stats.adSpend || 1);
    let profit = 0;
    if (skus.length > 0) {
      const skuProfitBeforeAds = skus.reduce((sum, sku) => sum + (sku.orders * (sku.unitProfitExclAds || 0)), 0);
      profit = skuProfitBeforeAds - stats.adSpend;
    } else {
      profit = stats.totalSales * 0.3 - stats.adSpend;
    }
    return { aov, acos, tacos, roas, doh: 0, profit, profitMargin: profit / (stats.totalSales || 1) };
  };

  const metrics = calculateMetrics(latestStats, skuData);
  const prevMetrics = calculateMetrics(prevStats, []);

  const getTrend = (current: number, previous: number) => {
    const diff = ((current - previous) / (previous || 1)) * 100;
    return { value: Math.abs(diff).toFixed(1) + '%', isUp: diff > 0 };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="space-y-6"
    >
      {/* AI Briefing Banner */}
      <motion.div variants={itemVariants} className="glass-panel relative overflow-hidden p-0 rounded-2xl flex items-center justify-between shadow-2xl shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-400 to-primary" />
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-glow">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold flex items-center gap-2 tracking-wide font-heading">
              AI Insight Summary
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">Stable</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
              Sales momentum is <strong className="text-emerald-400">up {getTrend(latestStats.totalSales, prevStats.totalSales).value}</strong>. 
              ACOS is maintained at a healthy {(metrics.acos * 100).toFixed(1)}%. Priority: <strong>{latestStats.claims} unsolved claims</strong> pending your review.
            </p>
          </div>
        </div>
        <div className="px-6 flex items-center gap-6 border-l border-white/5 h-full py-4 text-xs">
          <div className="flex flex-col text-right">
            <span className="text-slate-500">MXN/CNY</span>
            <span className="font-mono text-white">0.35</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-slate-500">Reputation</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Verde</span>
          </div>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard className="animate-float" delay={0} title="Today Sales (MXN)" value={`$${latestStats.totalSales.toLocaleString()}`} trend={getTrend(latestStats.totalSales, prevStats.totalSales)} icon={DollarSign} color="text-emerald-400" bg="from-emerald-500/20 to-transparent" />
        <StatCard className="" delay={0.1} title="Net Profit Est." value={`$${metrics.profit.toLocaleString()}`} trend={getTrend(metrics.profit, prevMetrics.profit)} icon={ShieldAlert} color="text-indigo-400" bg="from-indigo-500/20 to-transparent" />
        <StatCard className="" delay={0.2} title="Ad Spend" value={`$${latestStats.adSpend.toLocaleString()}`} trend={getTrend(metrics.acos, prevMetrics.acos)} icon={TrendingUp} color="text-amber-400" bg="from-amber-500/20 to-transparent" inverse />
        <StatCard className="" delay={0.3} title="TACOS" value={`${(metrics.tacos * 100).toFixed(1)}%`} trend={getTrend(metrics.tacos, prevMetrics.tacos)} icon={ArrowUpRight} color="text-purple-400" bg="from-purple-500/20 to-transparent" inverse />
        <StatCard className="" delay={0.4} title="Stock Health" value={skuData.length > 0 ? `${Math.min(100, Math.floor((1 - skuData.filter(s=>s.stock < (s.avgSalesSinceListing||1) * STOCK_HEALTH_THRESHOLD).length / (skuData.length || 1)) * 100))}%` : '0%'} trend={{value: '-', isUp: true}} icon={Package} color="text-blue-400" bg="from-blue-500/20 to-transparent" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Glowing Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-bold font-heading">Sales & Ad Performance</h3>
              <p className="text-slate-400 text-xs mt-1">30-day trailing revenue versus advertising expenditure</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-primary" />Sales </div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-amber-500" />Ads</div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glowSales" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => val.split('-').slice(1).join('/')} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="totalSales" stroke="#4f46e5" fill="url(#colorSales)" strokeWidth={3} filter="url(#glowSales)" />
                <Area type="monotone" dataKey="adSpend" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Priority SKUs Grid */}
        <motion.div variants={itemVariants} className="lg:col-span-1 glass-card rounded-2xl flex flex-col p-0 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-white font-bold font-heading">Watchlist SKUs</h3>
            <button onClick={() => onEditSku(null)} className="text-slate-400 hover:text-white transition-colors">
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {skuData.slice(0, 5).map((sku) => {
              const avgSales = sku.avgSalesSinceListing || 0.1;
              const doh = Math.floor(sku.stock / avgSales);
              const isLowStock = doh < STOCK_HEALTH_THRESHOLD;
              return (
                <div key={sku.sku} onClick={() => onEditSku(sku)} className="p-3 mb-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5 shadow-inner">
                      <Package className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-mono text-white font-bold group-hover:text-primary transition-colors">{sku.sku}</div>
                      <div className="text-[10px] text-slate-500 max-w-[120px] truncate">{sku.skuName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">${sku.unitProfitExclAds || 0} <span className="text-[9px] text-slate-500 font-sans">Margin</span></div>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className={`status-pill ${isLowStock ? 'pill-danger' : 'pill-success'} whitespace-nowrap`}>
                        {doh} DOH
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="text-white font-bold font-heading mb-4">Competitor Pulse (Top 3)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skuData.length > 0 ? (
              skuData.flatMap(sku => sku.competitors || []).slice(0, 3).map((comp, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50" />
                  <h4 className="text-sm text-white font-bold mb-2 truncate">{comp.name || 'Unnamed Competitor'}</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs text-slate-400">Price</div>
                      <div className="font-mono text-lg text-white">${comp.currentPrice}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Rating</div>
                      <div className="text-amber-400 text-sm font-bold">{comp.rating}★</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-sm text-slate-500 py-6 text-center">Awaiting competitor data input.</div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-1 glass-card rounded-2xl p-0 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-white font-bold font-heading flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Action Items</h3>
          </div>
          <div className="p-5 flex-1">
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-primary/50 flex items-center justify-center bg-primary/20"><div className="w-1.5 h-1.5 rounded-full bg-primary" /></div></div>
                <div>
                  <div className="text-sm text-white font-medium">Clear {latestStats.questions} Preguntas</div>
                  <div className="text-xs text-slate-400 mt-0.5">Pre-sales inquiries aging &gt; 2hrs</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-rose-500/50 flex items-center justify-center bg-rose-500/20"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /></div></div>
                <div>
                  <div className="text-sm text-white font-medium">Resolve {latestStats.claims} Reclamos</div>
                  <div className="text-xs text-rose-400/80 mt-0.5">High priority dispute resolution</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-slate-600 flex items-center justify-center" /></div>
                <div>
                  <div className="text-sm text-slate-300 font-medium line-through decoration-slate-600">Upload Restock Invoice</div>
                  <div className="text-xs text-slate-500 mt-0.5">Completed by System</div>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color, bg, inverse, delay, className = "" }: any) {
  const isPositive = inverse ? !trend.isUp : trend.isUp;
  return (
    <motion.div variants={{hidden: {y:20, opacity:0}, visible: {y:0, opacity:1, transition: {delay: delay}}}} className={`stat-card group ${className}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bg} rounded-bl-full opacity-20 -z-10 transition-transform group-hover:scale-110`} />
      <div className="stat-label">
        {title}
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${trend.value !== '-' ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
        {trend.value !== '-' && (trend.isUp ? '↑' : '↓')} {trend.value}
        <span className="text-slate-500 font-normal ml-1 text-[10px]">vs yesterday</span>
      </div>
    </motion.div>
  );
}
