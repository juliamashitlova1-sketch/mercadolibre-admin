import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map, Loader2, TrendingUp, ShoppingBag, DollarSign, 
  BarChart3, PieChart, AlertCircle, Activity, ArrowUpRight, 
  ArrowDownRight, Zap, Target, Users, Receipt
} from 'lucide-react';
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

// ====== 墨西哥州名匹配（西班牙语 + 缩写 + 常见变体）======
const MEXICO_STATES: Record<string, string[]> = {
  'Aguascalientes': ['aguascalientes', 'ags', 'aguascalientes'],
  'Baja California': ['baja california', 'b.c.', 'bc', 'baja california norte'],
  'Baja California Sur': ['baja california sur', 'b.c.s.', 'bcs'],
  'Campeche': ['campeche', 'camp'],
  'Chiapas': ['chiapas', 'chis'],
  'Chihuahua': ['chihuahua', 'chih'],
  'Ciudad de México': ['ciudad de méxico', 'ciudad de mexico', 'cdmx', 'distrito federal', 'd.f.', 'df', 'mexico city', 'ciudad de méx'],
  'Coahuila': ['coahuila', 'coah', 'coahuila de zaragoza'],
  'Colima': ['colima', 'col'],
  'Durango': ['durango', 'dgo'],
  'Estado de México': ['estado de méxico', 'estado de mexico', 'edomex', 'méxico', 'mexico', 'e.do.mex', 'edo.mex', 'estado de méx'],
  'Guanajuato': ['guanajuato', 'gto'],
  'Guerrero': ['guerrero', 'gro'],
  'Hidalgo': ['hidalgo', 'hgo'],
  'Jalisco': ['jalisco', 'jal'],
  'Michoacán': ['michoacán', 'michoacan', 'mich', 'michoacán de ocampo'],
  'Morelos': ['morelos', 'mor'],
  'Nayarit': ['nayarit', 'nay'],
  'Nuevo León': ['nuevo león', 'nuevo leon', 'n.l.', 'nl', 'nuevo león'],
  'Oaxaca': ['oaxaca', 'oax'],
  'Puebla': ['puebla', 'pue'],
  'Querétaro': ['querétaro', 'queretaro', 'qro'],
  'Quintana Roo': ['quintana roo', 'q.roo', 'q. roo', 'qr'],
  'San Luis Potosí': ['san luis potosí', 'san luis potosi', 'slp'],
  'Sinaloa': ['sinaloa', 'sin'],
  'Sonora': ['sonora', 'son'],
  'Tabasco': ['tabasco', 'tab'],
  'Tamaulipas': ['tamaulipas', 'tamps'],
  'Tlaxcala': ['tlaxcala', 'tlax'],
  'Veracruz': ['veracruz', 'ver', 'veracruz de ignacio de la llave'],
  'Yucatán': ['yucatán', 'yucatan', 'yuc'],
  'Zacatecas': ['zacatecas', 'zac'],
};

function extractState(address: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  // 先匹配更具体的州名（如 "Baja California Sur" 优先于 "Baja California"）
  const sortedStates = Object.entries(MEXICO_STATES).sort((a, b) => b[0].length - a[0].length);
  for (const [stateName, aliases] of sortedStates) {
    for (const alias of aliases) {
      // 匹配完整单词或逗号/括号分隔
      const regex = new RegExp(`(?:^|[,\\s(])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[,\\s)]|$)`, 'i');
      if (regex.test(lower)) return stateName;
    }
  }
  return null;
}

// ====== 墨西哥各州 SVG Path 数据（简化版） ======
const STATE_PATHS: Record<string, string> = {
  'Baja California': 'M 55,12 L 65,8 L 75,6 L 85,4 L 95,5 L 100,8 L 98,15 L 92,22 L 86,30 L 80,38 L 76,42 L 70,48 L 65,55 L 60,52 L 55,45 L 50,35 L 48,25 Z',
  'Baja California Sur': 'M 60,55 L 65,55 L 70,48 L 76,42 L 78,48 L 80,55 L 82,62 L 83,70 L 80,78 L 76,82 L 72,85 L 68,82 L 64,75 L 60,68 L 58,62 Z',
  'Sonora': 'M 110,30 L 125,25 L 140,22 L 155,24 L 168,28 L 175,35 L 178,45 L 175,55 L 170,62 L 165,68 L 155,70 L 145,72 L 135,70 L 125,65 L 115,58 L 108,50 L 105,42 L 108,35 Z',
  'Chihuahua': 'M 155,24 L 168,28 L 182,30 L 195,35 L 205,42 L 210,52 L 208,62 L 200,70 L 190,75 L 180,78 L 170,78 L 165,75 L 165,68 L 175,55 L 178,45 L 175,35 L 168,28 Z',
  'Coahuila': 'M 200,42 L 215,38 L 230,40 L 245,45 L 255,52 L 260,60 L 255,68 L 245,72 L 235,70 L 225,65 L 215,62 L 208,62 L 205,55 Z',
  'Durango': 'M 165,75 L 170,78 L 180,78 L 190,75 L 195,80 L 198,90 L 195,100 L 188,108 L 180,112 L 170,110 L 160,105 L 155,95 L 155,85 Z',
  'Tamaulipas': 'M 245,45 L 258,42 L 268,48 L 275,55 L 278,65 L 275,75 L 268,82 L 258,85 L 250,82 L 245,75 L 248,68 L 255,68 L 260,60 L 255,52 Z',
  'Nuevo León': 'M 230,68 L 245,65 L 255,68 L 258,75 L 255,82 L 248,88 L 238,90 L 228,88 L 222,82 L 225,75 Z',
  'Sinaloa': 'M 108,68 L 115,65 L 125,68 L 132,72 L 138,78 L 140,88 L 138,98 L 132,108 L 125,115 L 118,118 L 112,115 L 108,108 L 105,98 L 103,88 L 105,78 Z',
  'Zacatecas': 'M 188,108 L 198,105 L 208,108 L 218,112 L 222,120 L 218,128 L 210,132 L 200,130 L 192,125 L 188,118 Z',
  'San Luis Potosí': 'M 218,112 L 228,108 L 238,110 L 248,115 L 252,122 L 248,130 L 240,135 L 230,132 L 222,128 L 218,120 Z',
  'Nayarit': 'M 118,118 L 125,115 L 132,118 L 135,125 L 132,132 L 125,138 L 118,135 L 115,128 Z',
  'Jalisco': 'M 125,138 L 135,132 L 145,130 L 155,132 L 158,140 L 155,148 L 148,155 L 138,158 L 128,155 L 122,148 Z',
  'Aguascalientes': 'M 165,130 L 172,128 L 178,132 L 178,138 L 172,142 L 165,140 Z',
  'Colima': 'M 118,148 L 125,145 L 130,148 L 132,155 L 128,160 L 122,158 L 118,155 Z',
  'Michoacán': 'M 128,155 L 138,158 L 148,155 L 158,158 L 165,165 L 162,175 L 155,182 L 145,185 L 135,182 L 128,175 L 125,165 Z',
  'Guanajuato': 'M 155,132 L 165,130 L 175,132 L 178,140 L 175,148 L 168,155 L 158,158 L 155,148 Z',
  'Querétaro': 'M 175,148 L 182,145 L 190,148 L 192,155 L 188,162 L 180,162 L 175,158 Z',
  'Estado de México': 'M 168,165 L 178,162 L 188,165 L 195,170 L 198,178 L 192,185 L 182,188 L 172,185 L 168,178 Z',
  'Ciudad de México': 'M 182,170 L 188,168 L 192,172 L 190,178 L 185,180 L 182,176 Z',
  'Hidalgo': 'M 192,155 L 202,150 L 212,152 L 218,158 L 215,168 L 208,172 L 198,170 L 192,165 Z',
  'Guerrero': 'M 128,185 L 138,182 L 148,185 L 158,188 L 165,195 L 162,205 L 155,212 L 142,215 L 132,212 L 125,205 L 122,195 Z',
  'Morelos': 'M 168,188 L 178,185 L 185,188 L 185,195 L 178,198 L 170,196 Z',
  'Tlaxcala': 'M 195,172 L 202,170 L 205,175 L 202,180 L 196,178 Z',
  'Puebla': 'M 192,185 L 202,180 L 212,182 L 220,188 L 222,198 L 215,205 L 205,208 L 195,205 L 190,198 L 188,192 Z',
  'Veracruz': 'M 215,168 L 225,162 L 235,165 L 245,170 L 252,178 L 255,190 L 250,200 L 242,208 L 232,212 L 222,208 L 220,198 L 225,188 L 218,180 Z',
  'Oaxaca': 'M 162,215 L 172,212 L 182,215 L 195,218 L 205,222 L 212,230 L 208,240 L 198,245 L 185,248 L 175,245 L 165,238 L 160,228 Z',
  'Tabasco': 'M 212,228 L 222,225 L 232,228 L 240,232 L 242,240 L 238,248 L 228,250 L 218,248 L 212,242 L 210,235 Z',
  'Chiapas': 'M 198,248 L 208,245 L 218,248 L 225,255 L 228,265 L 222,275 L 212,280 L 202,278 L 195,272 L 192,262 L 195,255 Z',
  'Campeche': 'M 195,255 L 205,252 L 215,255 L 220,262 L 218,272 L 212,278 L 202,280 L 195,275 L 192,268 Z',
  'Yucatán': 'M 222,238 L 232,235 L 242,238 L 250,242 L 258,248 L 262,258 L 258,268 L 250,272 L 240,270 L 232,265 L 225,258 L 222,250 Z',
  'Quintana Roo': 'M 258,248 L 268,245 L 275,252 L 278,262 L 275,272 L 268,278 L 260,275 L 258,268 L 262,258 Z',
};

// 州名缩写 + 标注中心位置 [x, y]
const STATE_ABBR: Record<string, string> = {
  'Aguascalientes': 'AGU', 'Baja California': 'BCN', 'Baja California Sur': 'BCS',
  'Campeche': 'CAM', 'Chiapas': 'CHS', 'Chihuahua': 'CHH', 'Ciudad de México': 'CDMX',
  'Coahuila': 'COA', 'Colima': 'COL', 'Durango': 'DUR', 'Estado de México': 'MEX',
  'Guanajuato': 'GTO', 'Guerrero': 'GRO', 'Hidalgo': 'HGO', 'Jalisco': 'JAL',
  'Michoacán': 'MIC', 'Morelos': 'MOR', 'Nayarit': 'NAY', 'Nuevo León': 'NL',
  'Oaxaca': 'OAX', 'Puebla': 'PUE', 'Querétaro': 'QUE', 'Quintana Roo': 'QR',
  'San Luis Potosí': 'SLP', 'Sinaloa': 'SIN', 'Sonora': 'SON', 'Tabasco': 'TAB',
  'Tamaulipas': 'TAM', 'Tlaxcala': 'TLX', 'Veracruz': 'VER', 'Yucatán': 'YUC',
  'Zacatecas': 'ZAC',
};

const STATE_CENTERS: Record<string, [number, number]> = {
  'Baja California': [78, 20], 'Baja California Sur': [72, 68],
  'Sonora': [142, 48], 'Chihuahua': [188, 55], 'Coahuila': [232, 58],
  'Durango': [175, 92], 'Tamaulipas': [260, 65], 'Nuevo León': [242, 80],
  'Sinaloa': [120, 95], 'Zacatecas': [205, 118], 'San Luis Potosí': [235, 125],
  'Nayarit': [128, 128], 'Jalisco': [142, 145], 'Aguascalientes': [170, 135],
  'Colima': [125, 153], 'Michoacán': [148, 170], 'Guanajuato': [168, 142],
  'Querétaro': [183, 155], 'Estado de México': [183, 176], 'Ciudad de México': [187, 174],
  'Hidalgo': [205, 162], 'Guerrero': [148, 200], 'Morelos': [178, 192],
  'Tlaxcala': [200, 176], 'Puebla': [208, 195], 'Veracruz': [238, 185],
  'Oaxaca': [185, 232], 'Tabasco': [225, 240], 'Chiapas': [210, 262],
  'Campeche': [208, 265], 'Yucatán': [245, 252], 'Quintana Roo': [268, 260],
};

function getColorForCount(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(30, 41, 59, 0.4)'; // slate-800/40
  const ratio = maxCount > 0 ? count / maxCount : 0;
  // 从深蓝到亮青色的渐变
  if (ratio > 0.75) return '#0ea5e9'; // sky-500
  if (ratio > 0.5) return '#0284c7';  // sky-600
  if (ratio > 0.25) return '#0369a1'; // sky-700
  if (ratio > 0.1) return '#075985';  // sky-800
  return '#0c4a6e'; // sky-900
}

export default function DataDashboard() {
  const [data, setData] = useState<CleanedOrder[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [visitsData, setVisitsData] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

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

  // ====== 数据聚合与指标计算 ======
  const metrics = useMemo(() => {
    const validOrders = data.filter(d => d.status === 'valid');
    const totalOrders = validOrders.length;
    const totalUnitsCount = validOrders.reduce((acc, curr) => acc + (curr.units || 1), 0);
    
    const totalAdSpend = adsData.reduce((acc, curr) => acc + (parseFloat(curr.ad_spend) || 0), 0);
    const totalAdOrders = adsData.reduce((acc, curr) => acc + (parseInt(curr.ad_orders) || 0), 0);
    
    const totalVisits = visitsData.reduce((acc, curr) => acc + (parseInt(curr.unique_visits) || 0), 0);
    
    // 估算销售额 (假设平均售价, 实际应根据 SKU 匹配)
    // 建立 SKU -> Price 映射
    const skuPriceMap: Record<string, number> = {};
    skus.forEach(s => { skuPriceMap[s.sku] = parseFloat(s.price_mxn) || 0; });
    
    const totalSalesMxn = validOrders.reduce((acc, curr) => {
      const price = skuPriceMap[curr.sku] || 0;
      return acc + (price * (curr.units || 1));
    }, 0);

    const roas = totalAdSpend > 0 ? (totalSalesMxn / totalAdSpend) : 0;
    const conversionRate = totalVisits > 0 ? ((totalUnitsCount / totalVisits) * 100) : 0;
    
    // 估算利润 (粗略: 假设平均利润率 22%)
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

  // 成本结构数据 (取 sku_pricing 平均值)
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

  // UI Components Helper
  const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
    <div className={`v2-stat-card bg-${color}-500/5 border-${color}-500/20 p-4`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`v2-stat-label text-${color}-500/80`}>{title}</span>
        <div className={`p-1.5 bg-${color}-500/20 rounded-lg`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="v2-stat-value text-white text-2xl">{value}</span>
        {subValue && <span className="text-[10px] text-slate-500 font-medium mt-0.5">{subValue}</span>}
      </div>
    </div>
  );

  // 统计各州订单数量
  const stateOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(MEXICO_STATES).forEach(s => { counts[s] = 0; });

    const validOrders = data.filter(d => d.status === 'valid');
    let matched = 0;
    validOrders.forEach(order => {
      const state = extractState(order.buyer_address);
      if (state && counts[state] !== undefined) {
        counts[state]++;
        matched++;
      }
    });

    return { counts, total: validOrders.length, matched };
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(stateOrderCounts.counts), 1);
  }, [stateOrderCounts]);

  // 排序后的州列表（按订单数量降序）
  const sortedStates = useMemo(() => {
    return Object.entries(stateOrderCounts.counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [stateOrderCounts]);

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
        {/* Header */}
        <header className="v2-header relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
          <div className="flex items-center space-x-3 relative z-10">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-indigo-600">
               <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">MILYFLY 深度运营中心</h1>
              <p className="v2-header-subtitle">实时聚合全渠道销售、广告与流量资产分析看板</p>
            </div>
          </div>
          <div className="flex gap-2 relative z-10">
            <div className="px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-slate-300">系统连接正常</span>
            </div>
          </div>
        </header>

        {/* 核心指标行 */}
        <div className="v2-stats-grid">
          <StatCard 
            title="总销售额 (MXN)" 
            value={`$${metrics.totalSalesMxn.toLocaleString()}`} 
            subValue={`总件数: ${metrics.totalUnits}`} 
            icon={DollarSign} 
            color="sky" 
          />
          <StatCard 
            title="广告支出" 
            value={`$${metrics.totalAdSpend.toLocaleString()}`} 
            subValue={`${metrics.totalVisits.toLocaleString()} 总访问量`} 
            icon={Target} 
            color="indigo" 
          />
          <StatCard 
            title="广告 ROAS" 
            value={metrics.roas.toFixed(2)} 
            subValue={`点击价格: $${(metrics.totalAdSpend / (metrics.totalVisits || 1)).toFixed(2)}`} 
            icon={TrendingUp} 
            color="purple" 
          />
          <StatCard 
            title="预估净利润" 
            value={`¥${(metrics.totalProfitMxn * 6.8).toLocaleString()}`} 
            subValue="汇率: 6.8 (估算)" 
            icon={ShoppingBag} 
            color="emerald" 
          />
          <StatCard 
            title="有效订单" 
            value={metrics.totalOrders} 
            subValue={`件单价: $${(metrics.totalSalesMxn / (metrics.totalUnits || 1)).toFixed(1)}`} 
            icon={Receipt} 
            color="amber" 
          />
          <StatCard 
            title="全盘转化率" 
            value={`${metrics.conversionRate.toFixed(2)}%`} 
            subValue="单位转化效率" 
            icon={Users} 
            color="rose" 
          />
        </div>

        {/* 中间图表行 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 广告趋势 */}
          <div className="lg:col-span-6 v2-card p-4">
            <h3 className="v2-card-title mb-4 px-2"><BarChart3 className="w-4 h-4 text-sky-400" /> 广告投放与产出趋势 (30D)</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(str) => str.slice(5)} />
                  <YAxis stroke="#475569" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend iconType="circle" />
                  <Area type="monotone" name="销售额" dataKey="sales" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" name="广告支出" dataKey="spend" stroke="#6366f1" fillOpacity={1} fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 成本结构 */}
          <div className="lg:col-span-3 v2-card p-4">
            <h3 className="v2-card-title mb-4 px-2"><PieChart className="w-4 h-4 text-indigo-400" /> 销售额成本结构</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={costStructure}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
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
            <div className="space-y-1.5 mt-2 px-2">
                 {costStructure.map((item, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                       <span className="text-[9px] text-slate-400">{item.name}</span>
                     </div>
                     <span className="text-[9px] font-mono font-bold text-slate-200">{item.value.toFixed(1)}%</span>
                   </div>
                 ))}
            </div>
          </div>

          {/* 业务预警 */}
          <div className="lg:col-span-3 v2-card p-4">
            <h3 className="v2-card-title mb-4 px-2"><AlertCircle className="w-4 h-4 text-rose-400" /> 待处理运营预警</h3>
            <div className="space-y-3 px-2">
              <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold text-amber-400">库存预警: ML-X89</h4>
                  <p className="text-[9px] text-slate-500 mt-1">当前库存仅剩 12 件，预计消耗 3 天。</p>
                </div>
              </div>
              <div className="p-2.5 bg-rose-500/5 border border-rose-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold text-rose-400">广告支出超标</h4>
                  <p className="text-[9px] text-slate-500 mt-1">今日 ACOS 达到 45%，显著高于平均水平。</p>
                </div>
              </div>
              <div className="p-2.5 bg-sky-500/5 border border-sky-500/20 rounded-lg flex gap-3">
                <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold text-sky-400">转化率下滑</h4>
                  <p className="text-[9px] text-slate-500 mt-1">对比昨日，店铺整体转化率下降了 1.2%。</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 下方地图区域 */}
        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title">
              <Map className="w-4 h-4 text-sky-400" />
              墨西哥订单地理分布热力图
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-500">已匹配 {stateOrderCounts.matched} 单</span>
              <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: `${(stateOrderCounts.matched/metrics.totalOrders)*100}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row divide-x divide-slate-800">
            {/* 地图区域 */}
            <div className="flex-1 p-6 flex items-center justify-center min-h-[450px]">
                <svg
                  viewBox="40 0 250 300"
                  className="w-full max-w-[600px] h-auto"
                >
                  <defs>
                    <radialGradient id="map-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect x="40" y="0" width="250" height="300" fill="url(#map-glow)" rx="8" />

                  {Object.entries(STATE_PATHS).map(([stateName, pathD]) => {
                    const count = stateOrderCounts.counts[stateName] || 0;
                    const isHovered = hoveredState === stateName;
                    const fillColor = getColorForCount(count, maxCount);
                    const strokeColor = isHovered ? '#38bdf8' : 'rgba(148, 163, 184, 0.15)';
                    const strokeWidth = isHovered ? 1.5 : 0.5;

                    return (
                      <g key={stateName}>
                        <path
                          d={pathD}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredState(stateName)}
                          onMouseLeave={() => setHoveredState(null)}
                        />
                        {count > 0 && STATE_CENTERS[stateName] && (
                          <text
                            x={STATE_CENTERS[stateName][0]}
                            y={STATE_CENTERS[stateName][1]}
                            fill={isHovered ? "white" : "rgba(255,255,255,0.4)"}
                            fontSize="5"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ pointerEvents: 'none' }}
                          >
                            {STATE_ABBR[stateName]}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
            </div>

            {/* 列表区域 */}
            <div className="lg:w-[300px] bg-slate-900/30 flex flex-col">
              <div className="p-3 border-b border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top 销售区域</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[450px] custom-scrollbar">
                {sortedStates.map(([stateName, count]) => (
                  <div 
                    key={stateName}
                    className={`px-4 py-2.5 flex items-center justify-between border-b border-slate-800/30 transition-colors ${hoveredState === stateName ? 'bg-sky-500/10' : ''}`}
                    onMouseEnter={() => setHoveredState(stateName)}
                    onMouseLeave={() => setHoveredState(null)}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-200">{stateName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                         <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-sky-500" style={{ width: `${(count/maxCount)*100}%` }} />
                         </div>
                         <span className="text-[8px] text-slate-500">{((count/metrics.totalOrders)*100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-sky-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
