import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, ShoppingBag, DollarSign, 
  BarChart3, PieChart, AlertCircle, Zap, Target, Receipt
} from 'lucide-react';
import { 
  AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import MexicoMap from '../components/dashboard/MexicoMap';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: orders },
        { data: ads },
        { data: visits },
        { data: skuList },
        { data: pricingList }
      ] = await Promise.all([
        supabase.from('cleaned_orders').select('*').order('order_date', { ascending: false }),
        supabase.from('sku_ads').select('*'),
        supabase.from('sku_visits').select('*'),
        supabase.from('skus').select('*'),
        supabase.from('sku_pricing').select('*')
      ]);

      if (orders) setData(orders);
      if (ads) setAdsData(ads);
      if (visits) setVisitsData(visits);
      if (skuList) setSkus(skuList);
      if (pricingList) setPricing(pricingList);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const validOrders = data.filter(d => d.status === 'valid');
    const totalOrders = validOrders.length;
    const totalUnitsCount = validOrders.reduce((acc, curr) => acc + (curr.units || 1), 0);
    
    const totalAdSpend = adsData.reduce((acc, curr) => acc + (parseFloat(curr.ad_spend) || 0), 0);
    const totalVisits = visitsData.reduce((acc, curr) => acc + (parseInt(curr.unique_visits) || 0), 0);
    
    const skuPriceMap: Record<string, number> = {};
    skus.forEach(s => { skuPriceMap[s.sku] = parseFloat(s.price_mxn) || 0; });
    
    const totalSalesMxn = validOrders.reduce((acc, curr) => {
      const price = skuPriceMap[curr.sku] || 0;
      return acc + (price * (curr.units || 1));
    }, 0);

    const roas = totalAdSpend > 0 ? (totalSalesMxn / totalAdSpend) : 0;
    const conversionRate = totalVisits > 0 ? ((totalUnitsCount / totalVisits) * 100) : 0;
    const totalProfitMxn = totalSalesMxn * 0.22;

    return {
      totalOrders,
      totalUnits: totalUnitsCount,
      totalSalesMxn,
      totalAdSpend,
      roas,
      conversionRate,
      totalProfitMxn,
      totalVisits
    };
  }, [data, adsData, visitsData, skus]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, any> = {};
    const skuPriceMap: Record<string, number> = {};
    skus.forEach(s => { skuPriceMap[s.sku] = parseFloat(s.price_mxn) || 0; });
    
    data.filter(d => d.status === 'valid').forEach(d => {
      const date = d.order_date;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, spend: 0, units: 0 };
      const price = skuPriceMap[d.sku] || 0;
      dailyMap[date].sales += (price * (d.units || 1));
      dailyMap[date].units += (d.units || 1);
    });

    adsData.forEach(a => {
      const date = a.date;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, spend: 0, units: 0 };
      dailyMap[date].spend += (parseFloat(a.ad_spend) || 0);
    });

    return Object.values(dailyMap)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);
  }, [data, adsData, skus]);

  const costStructure = useMemo(() => {
    if (pricing.length === 0) return [
      { name: '平台利润', value: 17.5, color: '#0ea5e9' },
      { name: '物流成本', value: 25, color: '#6366f1' },
      { name: '广告投入', value: 8, color: '#f59e0b' },
      { name: '税费/退货', value: 11, color: '#ef4444' },
      { name: '净利润', value: 38.5, color: '#10b981' },
    ];
    
    const avg = (field: string) => pricing.reduce((acc, curr) => acc + (parseFloat(curr[field]) || 0), 0) / pricing.length;
    
    return [
      { name: '平台费用', value: avg('commission_rate') * 100, color: '#0ea5e9' },
      { name: '物流/其他', value: 25, color: '#6366f1' }, 
      { name: '广告投入', value: avg('ad_rate') * 100, color: '#f59e0b' },
      { name: '税费/退单', value: (avg('tax_rate') + avg('return_rate')) * 100, color: '#ef4444' },
      { name: '预估毛利', value: avg('margin'), color: '#10b981' },
    ];
  }, [pricing]);

  const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
    <div className={`v2-stat-card border-${color}-200 p-4 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full blur-2xl -mr-8 -mt-8`} />
      <div className="flex justify-between items-start mb-2 relative z-10">
        <span className="v2-stat-label">{title}</span>
        <div className={`p-1.5 bg-${color}-50 rounded-lg`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
      </div>
      <div className="flex flex-col relative z-10">
        <span className="v2-stat-value">{value}</span>
        {subValue && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{subValue}</span>}
      </div>
    </div>
  );

  const inventoryWarnings = useMemo(() => {
    const now = new Date();
    return skus.map(sku => {
      const listedInv = parseInt(sku.inventory, 10) || 0;
      const skuSales = data.filter(d => d.sku === sku.sku && d.status === 'valid');
      const totalUnits = skuSales.reduce((acc, curr) => acc + (curr.units || 1), 0);
      const currentStock = listedInv - totalUnits;
      const listedDate = sku.listed_date ? new Date(sku.listed_date) : new Date();
      const daysSinceListing = Math.max(1, Math.ceil((now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24)));
      const avgDailySales = totalUnits / daysSinceListing;
      const daysRemaining = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;
      
      return {
        sku: sku.sku,
        name: sku.product_name,
        stock: currentStock,
        daysRemaining,
        velocity: avgDailySales.toFixed(2)
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [skus, data]);

  if (isLoading) {
    return (
      <div className="v2-page-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <span className="text-slate-400 font-medium">深度解析全盘业务数据中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-page-container custom-scrollbar">
      <div className="v2-inner-container">
        {/* Header */}
        <header className="v2-header relative overflow-hidden group py-3">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
          <div className="flex items-center space-x-3 relative z-10">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-indigo-600 p-1.5">
               <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="v2-header-title text-base">MILYFLY 深度运营中心</h1>
              <p className="v2-header-subtitle">全渠道业务数据深度聚合看板</p>
            </div>
          </div>
          <div className="flex gap-2 relative z-10">
             <div className="px-2 py-1 bg-sky-500/10 rounded-md border border-sky-500/20 flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[11px] font-bold text-sky-400">SYNC LIVE</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard 
            title="总销售额 (MXN)" 
            value={`$${metrics.totalSalesMxn.toLocaleString()}`} 
            subValue={`总件数: ${metrics.totalUnits}`} 
            icon={DollarSign} 
            color="sky" 
          />
          <StatCard 
            title="有效订单" 
            value={metrics.totalOrders} 
            subValue={`客单价: $${(metrics.totalSalesMxn / (metrics.totalOrders || 1)).toFixed(1)}`} 
            icon={Receipt} 
            color="amber" 
          />
          <StatCard 
            title="广告支出" 
            value={`$${metrics.totalAdSpend.toLocaleString()}`} 
            subValue={`曝光次数: ${metrics.totalVisits.toLocaleString()}`} 
            icon={Target} 
            color="indigo" 
          />
          <StatCard 
            title="预估净利润" 
            value={`¥${(metrics.totalProfitMxn * 6.8).toLocaleString()}`} 
            subValue="汇率参考: 6.8" 
            icon={ShoppingBag} 
            color="emerald" 
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 v2-card p-4">
            <h3 className="v2-card-title mb-4 px-2"><BarChart3 className="w-4 h-4 text-sky-400" /> 销售与投放效率趋势 (30D)</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(str) => str.slice(5)} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Area type="monotone" name="销售额" dataKey="sales" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" name="广告支出" dataKey="spend" stroke="#6366f1" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="v2-card p-4 flex-1">
              <h3 className="v2-card-title mb-2 px-2"><PieChart className="w-4 h-4 text-indigo-400" /> 成本结构</h3>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={costStructure} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value">
                      {costStructure.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2">
                   {costStructure.map((item, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <span className="text-[11px] text-slate-500">{item.name}</span>
                       <span className="text-[11px] font-mono font-bold text-slate-300">{item.value.toFixed(0)}%</span>
                     </div>
                   ))}
              </div>
            </div>

            <div className="v2-card p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-100 shadow-sm">
               <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ROAS</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{metrics.roas.toFixed(2)}</div>
                  </div>
                  <div className="w-px h-12 bg-slate-200 mt-2" />
                  <div className="flex-1 text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CVR</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{metrics.conversionRate.toFixed(2)}%</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Inventory & Map Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 v2-card p-4 flex flex-col">
            <h3 className="v2-card-title mb-4 px-2"><AlertCircle className="w-4 h-4 text-rose-400" /> 库存预警</h3>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
              {inventoryWarnings.slice(0, 10).map((warn, i) => (
                <div key={i} className={`p-2 rounded-lg flex flex-col gap-1 border transition-colors ${warn.daysRemaining < 10 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{warn.sku}</span>
                    <span className={`text-[10px] font-mono font-black ${warn.daysRemaining < 10 ? 'text-rose-500' : 'text-slate-500'}`}>
                      {warn.daysRemaining >= 999 ? '∞' : `${warn.daysRemaining} 天`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500">
                    <span>余: {warn.stock} 件</span>
                    <span>日均: {warn.velocity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-9">
            <MexicoMap orders={data.filter(d => d.status === 'valid')} totalOrders={metrics.totalOrders} />
          </div>
        </div>
      </div>
    </div>
  );
}
