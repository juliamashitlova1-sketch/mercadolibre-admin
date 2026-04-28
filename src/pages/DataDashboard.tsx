// Sync Trigger: 2026-04-28 15:58
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, BarChart3, PieChart, AlertCircle, Activity, ArrowUpRight, 
  ArrowDownRight, Zap, Target, Users, Receipt, RefreshCw, Layers,
  DollarSign, ShoppingBag
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
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('all');

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
        { data: pricingList },
        { data: fakeOrders },
        { data: cargoDamage }
      ] = await Promise.all([
        supabase.from('cleaned_orders').select('*').order('order_date', { ascending: false }),
        supabase.from('sku_ads').select('*'),
        supabase.from('sku_visits').select('*'),
        supabase.from('skus').select('*'),
        supabase.from('sku_pricing').select('*'),
        supabase.from('fake_orders').select('*'),
        supabase.from('cargo_damage').select('*')
      ]);

      if (orders) setData(orders);
      if (ads) setAdsData(ads);
      if (visits) setVisitsData(visits);
      if (skuList) setSkus(skuList);
      if (pricingList) setPricing(pricingList);
      if (fakeOrders) setFakeOrdersData(fakeOrders);
      if (cargoDamage) setCargoDamageData(cargoDamage);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ====== 数据聚合与指标计算 ======
  const metrics = useMemo(() => {
    const validOrders = data.filter(d => d.status === 'valid');
    const totalOrders = validOrders.length;
    const totalUnitsCount = validOrders.reduce((acc, curr) => acc + (curr.units || 1), 0);
    
    // 建立 SKU -> Price 映射 (优先使用 sku_pricing 中的售价)
    const skuPriceMap: Record<string, number> = {};
    pricing.forEach(p => { 
      if (p.sku) skuPriceMap[p.sku.toUpperCase()] = parseFloat(p.selling_price_mxn) || 0; 
    });
    // 如果 pricing 中没有，则尝试从 skus 表中获取
    skus.forEach(s => { 
      if (s.sku && !skuPriceMap[s.sku.toUpperCase()]) {
        skuPriceMap[s.sku.toUpperCase()] = parseFloat(s.price_mxn) || 0; 
      }
    });
    
    const totalSalesMxn = validOrders.reduce((acc, curr) => {
      const price = skuPriceMap[curr.sku?.toUpperCase()] || 0;
      return acc + (price * (curr.units || 1));
    }, 0);

    const totalAdSpend = adsData
      .filter(a => a.sku && a.sku.toUpperCase() !== 'A15')
      .reduce((acc, curr) => acc + (parseFloat(curr.ad_spend) || 0), 0);
    
    const totalVisits = visitsData
      .filter(v => v.sku && v.sku.toUpperCase() !== 'A15')
      .reduce((acc, curr) => acc + (parseInt(curr.unique_visits) || 0), 0);

    const roas = totalAdSpend > 0 ? (totalSalesMxn / totalAdSpend) : 0;
    const conversionRate = totalVisits > 0 ? ((totalUnitsCount / totalVisits) * 100) : 0;
    
    // 利润计算：稍后由 skuDailyProfits 汇总得到精确值
    // 这里先占位，或者直接从逻辑中移除（如果 header 之后会更新）
    // 为了保持 metrics 对象的完整性，我们暂时设为 0，或者计算一个基础值
    // 但用户要求“真实总额”，所以我们应该在 skuDailyProfits 之后再汇总 header 里的利润
    
    return {
      totalOrders: totalOrders,
      totalUnits: totalUnitsCount,
      totalSalesMxn,
      totalAdSpend,
      roas,
      conversionRate,
      totalVisits
    };
  }, [data, adsData, visitsData, skus, pricing]);

  // 趋势数据 (最后30天)
  const chartData = useMemo(() => {
    const dailyMap: Record<string, any> = {};
    
    // 处理订单
    data.filter(d => d.status === 'valid').forEach(d => {
      const date = d.order_date;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, spend: 0, units: 0 };
      const price = skus.find(s => s.sku === d.sku)?.price_mxn || 0;
      dailyMap[date].sales += (price * (d.units || 1));
      dailyMap[date].units += (d.units || 1);
    });

    // 处理广告
    adsData.forEach(a => {
      const date = a.date;
      if (!dailyMap[date]) dailyMap[date] = { date, sales: 0, spend: 0, units: 0 };
      dailyMap[date].spend += (parseFloat(a.ad_spend) || 0);
    });

    return Object.values(dailyMap)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);
  }, [data, adsData, skus]);

  // 成本结构数据 (根据 sku_pricing 细则精确汇总)
  const costStructure = useMemo(() => {
    const activePricing = pricing.filter(p => p.sku && p.sku.toUpperCase() !== 'A15');
    if (activePricing.length === 0) return [
      { name: '平台费用', value: 17.5, color: '#0ea5e9' },
      { name: '物流成本', value: 25, color: '#6366f1' },
      { name: '广告投入', value: 8, color: '#f59e0b' },
      { name: '税费/退单', value: 11, color: '#ef4444' },
      { name: '净利润', value: 38.5, color: '#10b981' },
    ];
    
    // 加权平均或简单平均？鉴于这是一个宏观看板，使用受控 SKU 的平均设置
    const avg = (field: string) => activePricing.reduce((acc, curr) => acc + (parseFloat(curr[field]) || 0), 0) / activePricing.length;
    
    // 计算各项占比 (以平均售价为基准)
    const avgPrice = avg('selling_price_mxn') || 100;
    const commission = avg('commission_rate') * 100;
    const ad = (avg('ad_rate') || 0.08) * 100;
    const tax = (avg('tax_rate') || 0.0905) * 100;
    const returns = (avg('return_rate') || 0.02) * 100;
    
    // 物流分摊比例 (Fixed + LastMile + Freight) / Price
    const avgFixed = avg('fixed_fee') || 0;
    const avgLastMile = avg('last_mile_fee') || 0;
    const exchange = avg('exchange_rate') || MXN_TO_CNY;
    
    // 估算物流比例 (MXN 计)
    const logisticsRatio = ((avgFixed + avgLastMile) / avgPrice) * 100 + 5; // 补 5% 跨境运费
    
    const margin = avg('margin') || 20;

    return [
      { name: '平台费用', value: commission, color: '#0ea5e9' },
      { name: '物流/其他', value: logisticsRatio, color: '#6366f1' }, 
      { name: '广告投入', value: ad, color: '#f59e0b' },
      { name: '税费/退单', value: tax + returns, color: '#ef4444' },
      { name: '预估毛利', value: margin, color: '#10b981' },
    ];
  }, [pricing]);

  // UI Components Helper
  // UI Components Helper
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

  // ====== 利润计算核心逻辑 ======
  const calculateUnitProfit = (p: any) => {
    if (!p) return 0;
    
    // 1. 计算重量与基础费
    const singleUnitVolumetricWeight = ((p.unit_length || 0) * (p.unit_width || 0) * (p.unit_height || 0)) / 6000;
    const ar59Weight = Math.max(p.product_weight || 0, singleUnitVolumetricWeight);
    
    let calculatedFixed = 0;
    const sellingPrice = p.selling_price_mxn || 0;
    if (sellingPrice < 299 && sellingPrice > 0) {
      const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const idx = buckets.findIndex(b => ar59Weight <= b);
      const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
      const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
      const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];
      if (sellingPrice < 99) calculatedFixed = tableA[idx];
      else if (sellingPrice < 199) calculatedFixed = tableB[idx];
      else calculatedFixed = tableC[idx];
    }

    let calculatedLastMile = 0;
    if (sellingPrice >= 299) {
      const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
      const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];
      const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320];
      if (sellingPrice <= 499) calculatedLastMile = lmTable299To499[lmIdx];
      else calculatedLastMile = lmTableAbove499[lmIdx];
    }

    // 2. 计算平台费
    const commissionMxn = sellingPrice * (p.commission_rate || 0);
    const adFeeMxn = sellingPrice * (p.ad_rate || 0);
    const returnFeeMxn = sellingPrice * (p.return_rate || 0);
    const taxMxn = sellingPrice * (p.tax_rate || 0);
    const totalFeesMxn = commissionMxn + calculatedFixed + calculatedLastMile + adFeeMxn + returnFeeMxn + taxMxn;
    
    // 3. 换算 CNY
    const payoutMxn = sellingPrice - totalFeesMxn;
    const exchangeRate = p.exchange_rate || MXN_TO_CNY;
    const payoutCny = payoutMxn * exchangeRate;

    // 4. 物流分摊
    const boxCount = p.pack_count > 0 ? (p.replenishment_qty / p.pack_count) : 0;
    const singleBoxVolumeM3 = ((p.box_length || 0) * (p.box_width || 0) * (p.box_height || 0)) / 1000000;
    const singleBoxVolumetricWeight = ((p.box_length || 0) * (p.box_width || 0) * (p.box_height || 0)) / 6000;
    const singleBoxChargeableWeight = Math.max(p.box_weight || 0, singleBoxVolumetricWeight);
    
    const totalVolume = singleBoxVolumeM3 * boxCount;
    const totalChargeableWeight = singleBoxChargeableWeight * boxCount;

    const seaFreightTotal = totalVolume * (p.sea_freight_unit_price || 0);
    const seaFreightPerUnit = p.replenishment_qty > 0 ? (seaFreightTotal / p.replenishment_qty) : 0;
    
    const airFreightTotal = totalChargeableWeight * (p.air_freight_unit_price || 0);
    const airFreightPerUnit = p.replenishment_qty > 0 ? (airFreightTotal / p.replenishment_qty) : 0;

    const currentFreightPerUnit = p.logistics_mode === '空运' ? airFreightPerUnit : seaFreightPerUnit;

    return payoutCny - (p.purchase_price_cny || 0) - currentFreightPerUnit;
  };

  const skuDailyProfits = useMemo(() => {
    const dailyMap: Record<string, any> = {};

    // 1. 处理订单与毛利 (过滤 A15, A06, N/A 和 空 SKU)
    data.filter(d => d.status === 'valid' && d.sku && d.sku.toUpperCase() !== 'A15' && d.sku.toUpperCase() !== 'A06' && d.sku.toUpperCase() !== 'N/A').forEach(d => {
      const key = `${d.order_date}_${d.sku}`;
      if (!dailyMap[key]) dailyMap[key] = { date: d.order_date, sku: d.sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0 };
      
      const p = pricing.find(item => item.sku?.toUpperCase() === d.sku?.toUpperCase());
      const unitProfit = calculateUnitProfit(p);
      
      dailyMap[key].units += (d.units || 1);
      dailyMap[key].grossProfit += (unitProfit * (d.units || 1));
    });

    // 2. 处理广告支出 (过滤 A15, A06, N/A 和 空 SKU)
    adsData.filter(a => a.sku && a.sku.toUpperCase() !== 'A15' && a.sku.toUpperCase() !== 'A06' && a.sku.toUpperCase() !== 'N/A').forEach(a => {
      const key = `${a.date}_${a.sku}`;
      if (!dailyMap[key]) dailyMap[key] = { date: a.date, sku: a.sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0 };
      // 广告费自动换算 RMB (用户确认：adsData.ad_spend 是 USD)
      dailyMap[key].adSpend += (parseFloat(a.ad_spend) || 0) * USD_TO_MXN * MXN_TO_CNY;
    });

    // 3. 处理刷单支出 (过滤 A15, A06, N/A 和 空 SKU)
    fakeOrdersData.filter(f => f.sku && f.sku.toUpperCase() !== 'A15' && f.sku.toUpperCase() !== 'A06' && f.sku.toUpperCase() !== 'N/A').forEach(f => {
      const key = `${f.date}_${f.sku}`;
      if (!dailyMap[key]) dailyMap[key] = { date: f.date, sku: f.sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0 };
      const actualCost = Number(f.review_fee_cny || 0) - (Number(f.refund_amount_usd || 0) * USD_TO_MXN * MXN_TO_CNY);
      dailyMap[key].fakeOrderCost += actualCost;
    });

    // 4. 处理货损支出 (过滤 A15, A06, N/A 和 空 SKU)
    cargoDamageData.filter(c => c.sku && c.sku.toUpperCase() !== 'A15' && c.sku.toUpperCase() !== 'A06' && c.sku.toUpperCase() !== 'N/A').forEach(c => {
      const key = `${c.date}_${c.sku}`;
      if (!dailyMap[key]) dailyMap[key] = { date: c.date, sku: c.sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0 };
      const damageCost = Number(c.quantity || 0) * Number(c.sku_value_cny || 0);
      dailyMap[key].cargoDamageCost += damageCost;
    });

    return Object.values(dailyMap)
      .map(item => ({
        ...item,
        netProfit: item.grossProfit - item.adSpend - item.fakeOrderCost - item.cargoDamageCost
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, pricing, adsData, fakeOrdersData, cargoDamageData]);

  // 新增：精确汇总利润
  const totalNetProfitRmb = useMemo(() => {
    return skuDailyProfits.reduce((acc, curr) => acc + curr.netProfit, 0);
  }, [skuDailyProfits]);

  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    skuDailyProfits.forEach(item => datesSet.add(item.date));
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [skuDailyProfits]);

  const displayProfits = useMemo(() => {
    if (selectedDate === 'all') {
      const skuTotals: Record<string, any> = {};
      skuDailyProfits.forEach(item => {
        if (!skuTotals[item.sku]) {
          skuTotals[item.sku] = { sku: item.sku, units: 0, grossProfit: 0, adSpend: 0, fakeOrderCost: 0, cargoDamageCost: 0, netProfit: 0 };
        }
        skuTotals[item.sku].units += item.units;
        skuTotals[item.sku].grossProfit += item.grossProfit;
        skuTotals[item.sku].adSpend += item.adSpend;
        skuTotals[item.sku].fakeOrderCost += item.fakeOrderCost;
        skuTotals[item.sku].cargoDamageCost += item.cargoDamageCost;
        skuTotals[item.sku].netProfit += item.netProfit;
      });
      return Object.values(skuTotals).sort((a, b) => b.netProfit - a.netProfit);
    }
    return skuDailyProfits.filter(item => item.date === selectedDate);
  }, [skuDailyProfits, selectedDate]);

  const totalOrders = data.filter(d => d.status === 'valid').length;

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
        {/* Header - Compact version */}
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

        {/* 第一行：精简核心指标 (4个) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard 
            title="总销售额 (MXN)" 
            value={
              <div className="flex flex-col">
                <span>${metrics.totalSalesMxn.toLocaleString()}</span>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  US$ {(metrics.totalSalesMxn / USD_TO_MXN).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
              </div>
            }
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
            title="盈利总额 (RMB)" 
            value={`¥${totalNetProfitRmb.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`} 
            subValue="全维度净利润汇总" 
            icon={ShoppingBag} 
            color="emerald" 
          />
        </div>

        {/* 第二行：主分析视图 (8:4 布局) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 广告/销售混合趋势 */}
          <div className="lg:col-span-8 v2-card p-4">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="v2-card-title"><BarChart3 className="w-4 h-4 text-sky-400" /> 销售与投放效率趋势 (30D)</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-[11px] text-slate-400">销售核心</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[11px] text-slate-400">广告支点</span>
                </div>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(str) => str.slice(5)} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Area type="monotone" name="销售额" dataKey="sales" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" name="广告支出" dataKey="spend" stroke="#6366f1" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 转化与效率洞察 */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* 成本结构饼图 */}
            <div className="v2-card p-4 flex-1">
              <h3 className="v2-card-title mb-2 px-2"><PieChart className="w-4 h-4 text-indigo-400" /> 成本结构</h3>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={costStructure}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {costStructure.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2">
                   {costStructure.slice(0, 4).map((item, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <span className="text-[11px] text-slate-500">{item.name}</span>
                       <span className="text-[11px] font-mono font-bold text-slate-300">{item.value.toFixed(0)}%</span>
                     </div>
                   ))}
              </div>
            </div>

            {/* 关键效率卡片 (ROAS & Conv) */}
            <div className="v2-card p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-100 shadow-sm">
               <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ROAS</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{metrics.roas.toFixed(2)}</div>
                    <div className="text-[10px] text-sky-600 font-bold uppercase tracking-tight">广告产出比</div>
                  </div>
                  <div className="w-px h-12 bg-slate-200 mt-2" />
                  <div className="flex-1 text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CVR</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{metrics.conversionRate.toFixed(2)}%</div>
                    <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">全店转化率</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* 第三行：地理与告警 (3:6:3 布局) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 业务预警 (lg:3) */}
          <div className="lg:col-span-3 v2-card p-4 flex flex-col">
            <h3 className="v2-card-title mb-4 px-2"><AlertCircle className="w-4 h-4 text-rose-400" /> 库存预警</h3>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
              {(() => {
                const now = new Date();
                const skuWarnings = skus
                  .filter(sku => sku.sku && sku.sku.toUpperCase() !== 'A15' && sku.sku.toUpperCase() !== 'A06' && sku.sku.toUpperCase() !== 'N/A')
                  .map(sku => {
                  // 1. Calculate Total Stock
                  const listedInv = parseInt(sku.inventory, 10) || 0;
                  const replenishInv = parseInt(sku.replenish_inventory, 10) || 0;
                  
                  // 2. Fetch sales for this SKU
                  const skuSales = data.filter(d => d.sku === sku.sku && d.status === 'valid');
                  const totalUnits = skuSales.reduce((acc, curr) => acc + (curr.units || 1), 0);
                  
                  const currentStock = listedInv - totalUnits;
                  
                  // 3. Calculate Daily Sales Velocity
                  const listedDate = sku.listed_date ? new Date(sku.listed_date) : new Date();
                  const daysSinceListing = Math.max(1, Math.ceil((now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24)));
                  const avgDailySales = totalUnits / daysSinceListing;
                  
                  // 4. Calculate Sales Duration
                  const daysRemaining = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;
                  
                  return {
                    sku: sku.sku,
                    name: sku.product_name,
                    stock: currentStock,
                    daysRemaining,
                    velocity: avgDailySales.toFixed(2)
                  };
                }).sort((a, b) => a.daysRemaining - b.daysRemaining);

                if (skuWarnings.length === 0) {
                  return <p className="text-[11px] text-slate-500 text-center py-4 italic">暂无 SKU 数据</p>;
                }

                return skuWarnings.map((warn, i) => {
                  const isCritical = warn.daysRemaining < 10;
                  const isWarning = warn.daysRemaining < 30;
                  
                  return (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg flex flex-col gap-1 border transition-colors ${
                        isCritical ? 'bg-rose-500/10 border-rose-500/20' : 
                        isWarning ? 'bg-amber-500/10 border-amber-500/20' : 
                        'bg-emerald-500/5 border-emerald-500/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]" title={warn.name}>
                          {warn.sku}
                        </span>
                        <span className={`text-[10px] font-mono font-black ${
                          isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {warn.daysRemaining >= 999 ? '∞' : `${warn.daysRemaining} 天`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-500">余: {warn.stock} 件</span>
                        <span className="text-slate-500 text-[8px]">日均: {warn.velocity}</span>
                      </div>
                      {isCritical && (
                        <div className="flex items-center gap-1 text-[8px] text-rose-500 font-bold mt-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> 建议立即补货
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* 各 SKU 每日盈利汇总 (lg:9) */}
          <div className="lg:col-span-9 v2-card flex flex-col">
            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="v2-card-title !mb-0">SKU 盈利数据核算</h3>
                <div className="ml-4 flex items-center bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1">
                  <span className="text-[10px] text-slate-500 font-bold mr-2 uppercase tracking-tighter">日期筛选:</span>
                  <select 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-sky-400 outline-none cursor-pointer hover:text-sky-300 transition-colors"
                  >
                    <option value="all" className="bg-slate-900 text-slate-300 font-bold">🔘 全部时期汇总</option>
                    {availableDates.map(date => (
                      <option key={date} value={date} className="bg-slate-900 text-slate-300 font-bold">📅 {date}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 w-full md:w-auto justify-end">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> 最终净利</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /> 亏损项</span>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">日期</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-center">销量</th>
                    <th className="px-4 py-3 text-right">毛利润</th>
                    <th className="px-4 py-3 text-right">刷单支出</th>
                    <th className="px-4 py-3 text-right">货损支出</th>
                    <th className="px-4 py-3 text-right">广告耗材</th>
                    <th className="px-4 py-3 text-right bg-emerald-500/5">最终净利</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {displayProfits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500 italic text-xs">暂无盈利核算数据</td>
                    </tr>
                  ) : displayProfits.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-4 py-2.5 text-[11px] font-mono text-slate-400">
                        {selectedDate === 'all' ? (
                          <span className="text-[9px] bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/30 text-slate-500">全部汇总</span>
                        ) : item.date}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-bold text-sky-400">{item.sku}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-center text-slate-300">{item.units}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-right text-emerald-400">¥{item.grossProfit.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-right text-rose-400/80">¥{item.fakeOrderCost.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-right text-rose-400/80">¥{item.cargoDamageCost.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-right text-rose-400/80">¥{item.adSpend.toFixed(1)}</td>
                      <td className={`px-4 py-2.5 text-[12px] font-mono font-black text-right border-l border-emerald-500/10 ${item.netProfit > 0 ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'}`}>
                        ¥{item.netProfit.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayProfits.length > 50 && (
                <div className="p-3 text-center border-t border-slate-800/30">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">仅展示最近 50 条记录</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
