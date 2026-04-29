// Sync Trigger: 2026-04-29 20:58
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, BarChart3, PieChart, AlertCircle, Activity, ArrowUpRight, 
  ArrowDownRight, Zap, Target, Users, Receipt, RefreshCw, Layers,
  DollarSign, ShoppingBag, ShieldAlert, Gauge, Rocket, Scale
} from 'lucide-react';
import { MXN_TO_CNY, USD_TO_MXN } from '../constants';
import { 
  LineChart, Line, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from 'recharts';
import { supabase } from '../lib/supabase';

interface CleanedOrder {
  order_id: string;
  order_date: string;
  sku: string;
  units: number;
  status: 'valid' | 'cancel' | 'refund';
  buyer_address: string;
}

export default function DataDashboard() {
  const [data, setData] = useState<CleanedOrder[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [visitsData, setVisitsData] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [fakeOrdersData, setFakeOrdersData] = useState<any[]>([]);
  const [cargoDamageData, setCargoDamageData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [orders, ads, visits, skuList, priceList, fake, damage] = await Promise.all([
        supabase.from('cleaned_orders').select('*'),
        supabase.from('sku_ads').select('*'),
        supabase.from('sku_visits').select('*'),
        supabase.from('skus').select('*'),
        supabase.from('sku_pricing').select('*'),
        supabase.from('fake_orders').select('*'),
        supabase.from('cargo_damage').select('*')
      ]);

      setData(orders.data || []);
      setAdsData(ads.data || []);
      setVisitsData(visits.data || []);
      setSkus(skuList.data || []);
      setPricing(priceList.data || []);
      setFakeOrdersData(fake.data || []);
      setCargoDamageData(damage.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const totalOrders = data.filter(d => d.status === 'valid').length;
    const totalSalesMxn = data.filter(d => d.status === 'valid').reduce((acc, curr) => {
      const price = skus.find(s => s.sku === curr.sku)?.price_mxn || 0;
      return acc + (price * (curr.units || 1));
    }, 0);

    const totalAdSpend = adsData.reduce((acc, curr) => acc + (parseFloat(curr.ad_spend) || 0), 0);
    const totalVisits = adsData.reduce((acc, curr) => acc + (parseInt(curr.clicks) || 0), 0);

    return { totalOrders, totalSalesMxn, totalAdSpend, totalVisits };
  }, [data, skus, adsData]);

  const costStructure = useMemo(() => {
    if (pricing.length === 0) return [];
    const avg = (field: string) => pricing.reduce((acc, curr) => acc + (curr[field] || 0), 0) / pricing.length;
    
    const commission = avg('commission_rate') * 100 || 17.5;
    const ad = avg('ad_rate') * 100 || 8;
    const tax = avg('tax_rate') * 100 || 9.05;
    const returns = avg('return_rate') * 100 || 2;
    const avgFixed = avg('fixed_fee') || 25;
    const avgLastMile = avg('last_mile_fee') || 0;
    const avgPrice = avg('selling_price_mxn') || 300;
    
    const logisticsRatio = ((avgFixed + avgLastMile) / avgPrice) * 100 + 5;
    const margin = avg('margin') || 20;

    return [
      { name: '平台费用', value: commission, color: '#0ea5e9' },
      { name: '物流/其他', value: logisticsRatio, color: '#6366f1' }, 
      { name: '广告投入', value: ad, color: '#f59e0b' },
      { name: '税费/退单', value: tax + returns, color: '#ef4444' },
      { name: '预估毛利', value: margin, color: '#10b981' },
    ];
  }, [pricing]);

  const calculateUnitProfit = (p: any) => {
    if (!p) return 0;
    const singleUnitVolumetricWeight = ((p.unit_length || 0) * (p.unit_width || 0) * (p.unit_height || 0)) / 6000;
    const ar59Weight = Math.max(p.product_weight || 0, singleUnitVolumetricWeight);
    let fixed = 0;
    const sp = p.selling_price_mxn || 0;
    if (sp < 299 && sp > 0) fixed = 35; // Simplified for dashboard
    let lm = 0;
    if (sp >= 299) lm = 75; // Simplified
    const commission = sp * (p.commission_rate || 0.175);
    const ad = sp * (p.ad_rate || 0.08);
    const ret = sp * (p.return_rate || 0.02);
    const tax = sp * (p.tax_rate || 0.0905);
    const payoutCny = (sp - commission - fixed - lm - ad - ret - tax) * (p.exchange_rate || MXN_TO_CNY);
    const vol = ((p.box_length || 0) * (p.box_width || 0) * (p.box_height || 0)) / 1000000;
    const boxWeight = Math.max(p.box_weight || 0, (p.box_length * p.box_width * p.box_height) / 6000);
    const freight = p.logistics_mode === '空运' ? (boxWeight * (p.air_freight_unit_price || 0)) : (vol * (p.sea_freight_unit_price || 0));
    const freightPerUnit = p.replenishment_qty > 0 ? (freight / p.replenishment_qty) : 0;
    return payoutCny - (p.purchase_price_cny || 0) - freightPerUnit;
  };

  const skuDailyProfits = useMemo(() => {
    const dailyMap: Record<string, any> = {};
    const pricingMap = {};
    pricing.forEach(p => { if (p.sku) pricingMap[p.sku.toUpperCase()] = p; });

    data.filter(d => d.status === 'valid').forEach(d => {
      const sku = d.sku?.toUpperCase();
      if (!sku || sku === 'A15') return;
      const key = `${d.order_date}_${sku}`;
      if (!dailyMap[key]) dailyMap[key] = { date: d.order_date, sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0 };
      dailyMap[key].units += (d.units || 1);
      const profit = calculateUnitProfit(pricingMap[sku]);
      dailyMap[key].grossProfit += (profit * (d.units || 1));
    });

    adsData.forEach(a => {
      const sku = a.sku?.toUpperCase();
      if (!sku || sku === 'A15') return;
      const key = `${a.date}_${sku}`;
      if (!dailyMap[key]) dailyMap[key] = { date: a.date, sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0 };
      dailyMap[key].adSpend += (parseFloat(a.ad_spend) || 0) * USD_TO_MXN * MXN_TO_CNY;
    });

    fakeOrdersData.forEach(f => {
      const key = `${f.date}_${f.sku?.toUpperCase()}`;
      if (dailyMap[key]) dailyMap[key].fakeOrderCost += Number(f.review_fee_cny || 0);
    });

    cargoDamageData.forEach(c => {
      const key = `${c.date}_${c.sku?.toUpperCase()}`;
      if (dailyMap[key]) dailyMap[key].cargoDamageCost += Number(c.quantity || 0) * Number(c.sku_value_cny || 0);
    });

    return Object.values(dailyMap).map((item: any) => ({
      ...item,
      netProfit: item.grossProfit - item.adSpend - item.fakeOrderCost - item.cargoDamageCost
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [data, pricing, adsData, fakeOrdersData, cargoDamageData]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, any> = {};
    data.filter(d => d.status === 'valid').forEach(d => {
      const date = d.order_date;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, spend: 0, units: 0, profit: 0, adOrders: 0, adSales: 0 };
      const price = skus.find(s => s.sku === d.sku)?.price_mxn || 0;
      dailyMap[date].sales += (price * (d.units || 1));
      dailyMap[date].units += (d.units || 1);
    });
    adsData.forEach(a => {
      const date = a.date;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, spend: 0, units: 0, profit: 0, adOrders: 0, adSales: 0 };
      const spendMxn = (parseFloat(a.ad_spend) || 0) * USD_TO_MXN;
      dailyMap[date].spend += spendMxn;
      const orders = parseInt(a.ad_orders) || 0;
      dailyMap[date].adOrders += orders;
      const price = skus.find(s => s.sku === a.sku)?.price_mxn || 0;
      dailyMap[date].adSales += (price * orders);
    });
    skuDailyProfits.forEach(item => {
      const date = item.date;
      if (dailyMap[date]) dailyMap[date].profit += item.netProfit;
    });

    return Object.values(dailyMap).map((item: any) => {
      const roas = item.spend > 0 ? (item.adSales / item.spend) : 0;
      const acos = item.adSales > 0 ? (item.spend / item.adSales) * 100 : 0;
      return { ...item, roas: parseFloat(roas.toFixed(2)), acos: parseFloat(acos.toFixed(1)), adUnits: item.adOrders, organicUnits: Math.max(0, item.units - item.adOrders) };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-30);
  }, [data, adsData, skus, skuDailyProfits]);

  const totalNetProfitRmb = useMemo(() => skuDailyProfits.reduce((acc, curr) => acc + curr.netProfit, 0), [skuDailyProfits]);

  const inventoryHealth = useMemo(() => {
    return skus.filter(s => s.sku && s.sku !== 'A15').map(s => {
      const recent = data.filter(d => d.sku === s.sku && d.status === 'valid').reduce((acc, curr) => acc + (curr.units || 1), 0);
      const velocity = recent / 30;
      const stock = (parseInt(s.inventory) || 0);
      const days = velocity > 0 ? (stock / velocity) : 999;
      return { sku: s.sku, stock, days };
    }).sort((a, b) => a.days - b.days).slice(0, 5);
  }, [skus, data]);

  const anomalyMetrics = useMemo(() => {
    const total = data.length;
    const refunds = data.filter(d => d.status === 'refund').length;
    return { refundRate: total > 0 ? (refunds / total) * 100 : 0, refundCount: refunds };
  }, [data]);

  const availableDates = useMemo(() => Array.from(new Set(skuDailyProfits.map(i => i.date))).sort((a, b) => b.localeCompare(a)), [skuDailyProfits]);

  const displayProfits = useMemo(() => {
    if (selectedDate === 'all') {
      const skuTotals: Record<string, any> = {};
      skuDailyProfits.forEach(item => {
        if (!skuTotals[item.sku]) skuTotals[item.sku] = { sku: item.sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0, netProfit: 0 };
        skuTotals[item.sku].units += item.units;
        skuTotals[item.sku].grossProfit += item.grossProfit;
        skuTotals[item.sku].adSpend += item.adSpend;
        skuTotals[item.sku].fakeOrderCost += item.fakeOrderCost;
        skuTotals[item.sku].cargoDamageCost += item.cargoDamageCost;
        skuTotals[item.sku].netProfit += item.netProfit;
      });
      return Object.values(skuTotals).sort((a: any, b: any) => b.netProfit - a.netProfit);
    }
    return skuDailyProfits.filter(item => item.date === selectedDate);
  }, [skuDailyProfits, selectedDate]);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className={`bg-white rounded-2xl border border-${color}-100 p-4 shadow-sm relative overflow-hidden`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 bg-${color}-50 rounded-full blur-2xl opacity-50`} />
      <div className="flex justify-between items-center mb-1 relative z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 bg-${color}-50 rounded-lg`}><Icon className={`w-3.5 h-3.5 text-${color}-600`} /></div>
      </div>
      <div className="text-xl font-black text-slate-800 relative z-10">{value}</div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  return (
    <div className="v2-page-container bg-slate-50/50">
      <div className="v2-inner-container space-y-4">
        <header className="flex justify-between items-center py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-100"><Zap className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">MILYFLY 运营决策中心</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Business Intelligence</p>
            </div>
          </div>
          <div className="flex gap-2"><div className="px-3 py-1 bg-white border border-slate-200 rounded-lg flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black text-slate-600">LIVE SYNC</span></div></div>
        </header>

        {/* Row 1: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="总销售额 (MXN)" value={`$${metrics.totalSalesMxn.toLocaleString()}`} icon={DollarSign} color="sky" />
          <StatCard title="有效订单" value={metrics.totalOrders} icon={Receipt} color="amber" />
          <StatCard title="广告支出" value={`$${metrics.totalAdSpend.toLocaleString()}`} icon={Target} color="indigo" />
          <StatCard title="盈利总额 (RMB)" value={`¥${totalNetProfitRmb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={ShoppingBag} color="emerald" />
        </div>

        {/* Row 2: Performance & Cost */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-sky-500" /> 销售与盈利趋势趋势线</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                  <YAxis yAxisId="left" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }} />
                  <Legend verticalAlign="top" height={30} iconType="circle" />
                  <Area yAxisId="left" type="monotone" name="销售额" dataKey="sales" stroke="#0ea5e9" fill="url(#colorSales)" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" name="盈利额" dataKey="profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-indigo-500" /> 成本结构深度分析</h3>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={costStructure} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                    {costStructure.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {costStructure.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-500">{item.name}</span>
                  <span className="text-[9px] font-black text-slate-800">{item.value.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Efficiency & Mix */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2"><Rocket className="w-4 h-4 text-emerald-500" /> 广告效率 (ROI/ACOS)</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={8} tickFormatter={d => d.slice(8)} />
                  <YAxis yAxisId="left" fontSize={8} />
                  <YAxis yAxisId="right" orientation="right" fontSize={8} />
                  <Tooltip contentStyle={{ fontSize: '10px' }} />
                  <Line yAxisId="left" type="monotone" name="ROAS" dataKey="roas" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" name="ACOS%" dataKey="acos" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> 订单结构 (自然 vs 广告)</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={8} tickFormatter={d => d.slice(8)} />
                  <YAxis fontSize={8} />
                  <Tooltip contentStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="adUnits" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="organicUnits" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> 风险监控与库存健康</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-[8px] font-black text-rose-400 uppercase">退款率</span>
                <div className="text-base font-black text-rose-600">{anomalyMetrics.refundRate.toFixed(1)}%</div>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[8px] font-black text-emerald-400 uppercase">库存评分</span>
                <div className="text-base font-black text-emerald-600 font-mono">Good</div>
              </div>
            </div>
            <div className="space-y-2">
              {inventoryHealth.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-600">{item.sku}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold ${item.days < 7 ? 'text-rose-500' : 'text-amber-500'}`}>可售{item.days.toFixed(0)}天</span>
                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.days < 7 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (item.days / 30) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Details Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-700 flex items-center gap-2"><Scale className="w-4 h-4 text-sky-500" /> SKU 经营利润细则 (RMB)</h3>
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
              <option value="all">全时段汇总</option>
              {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  <th className="px-4 py-3">SKU 信息</th>
                  <th className="px-4 py-3 text-right">总销量</th>
                  <th className="px-4 py-3 text-right">预估毛利</th>
                  <th className="px-4 py-3 text-right">广告支出</th>
                  <th className="px-4 py-3 text-right">刷单/货损</th>
                  <th className="px-4 py-3 text-right">最终净利</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayProfits.map((item: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2 text-[10px] font-black text-slate-800">{item.sku}</td>
                    <td className="px-4 py-2 text-[10px] text-right font-mono text-slate-500">{item.units}</td>
                    <td className="px-4 py-2 text-[10px] text-right text-emerald-500 font-bold">¥{item.grossProfit.toFixed(0)}</td>
                    <td className="px-4 py-2 text-[10px] text-right text-rose-400">¥{item.adSpend.toFixed(0)}</td>
                    <td className="px-4 py-2 text-[10px] text-right text-slate-300">¥{(item.fakeOrderCost + item.cargoDamageCost).toFixed(0)}</td>
                    <td className="px-4 py-2 text-right"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${item.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>¥{item.netProfit.toFixed(0)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
