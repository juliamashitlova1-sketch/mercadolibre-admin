import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, PlusCircle, DollarSign, ShieldAlert, TrendingUp, ArrowUpRight, Package } from 'lucide-react';
import { format } from 'date-fns';
import { DailyStats, SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import { StatCard } from '../components/StatCard';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  dailyData: DailyStats[];
  skuData: SKUStats[];
  onOpenDataEntry: () => void;
  onEditSku: (sku: SKUStats | null) => void;
}

export default function Overview() {
  const { dailyData, skuData, onOpenDataEntry, onEditSku } = useOutletContext<ContextType>();
  const [mexicoTime, setMexicoTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      setMexicoTime(new Intl.DateTimeFormat('en-GB', options).format(now));
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
    
    const profitMargin = profit / (stats.totalSales || 1);
    
    return { aov, acos, tacos, roas, doh: 0, profit, profitMargin };
  };

  const metrics = calculateMetrics(latestStats, skuData);
  const prevMetrics = calculateMetrics(prevStats, []);

  const getTrend = (current: number, previous: number) => {
    const diff = ((current - previous) / (previous || 1)) * 100;
    return {
      value: Math.abs(diff).toFixed(1) + '%',
      isUp: diff > 0,
    };
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <span className="text-[12px] bg-border px-3 py-1 rounded-full text-text-sub">
            MXN/CNY: 0.35
          </span>
          <span className="text-[12px] bg-border px-3 py-1 rounded-full text-text-sub">
            USD/MXN: 17.15
          </span>
        </div>
        <div className="flex gap-5 items-center">
          <div className="flex items-center gap-2 text-[12px] bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-mono">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            CDMX: {mexicoTime}
          </div>
          <div className="flex items-center gap-2 font-semibold text-success text-sm">
            <div className="w-3 h-3 bg-success rounded-full" />
            店铺信誉: Verde (极佳)
          </div>
          <div className="text-sm font-medium">
            未处理 Reclamos: <span className="text-danger">{latestStats.claims}</span>
          </div>
          <div className="text-sm font-medium">
            未处理 Preguntas: <span className="text-primary">{latestStats.questions}</span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="今日总销售额" 
          value={`$${latestStats.totalSales.toLocaleString()}`}
          trend={getTrend(latestStats.totalSales, prevStats.totalSales)}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          description="MXN"
        />
        <StatCard 
          title="真实净利润 (估算)" 
          value={`$${metrics.profit.toLocaleString()}`}
          trend={getTrend(metrics.profit, prevMetrics.profit)}
          icon={<ShieldAlert className="w-5 h-5 text-emerald-500" />}
          description={`利润率: ${(metrics.profitMargin * 100).toFixed(1)}%`}
        />
        <StatCard 
          title="当日广告花费" 
          value={`$${latestStats.adSpend.toLocaleString()}`}
          trend={getTrend(metrics.acos, prevMetrics.acos)}
          icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
          description={`ACOS: ${(metrics.acos * 100).toFixed(1)}%`}
          inverseTrend
        />
        <StatCard 
          title="TACOS (总广告占比)" 
          value={`${(metrics.tacos * 100).toFixed(1)}%`}
          trend={getTrend(metrics.tacos, prevMetrics.tacos)}
          icon={<ArrowUpRight className="w-5 h-5 text-indigo-500" />}
          description="健康阈值: <15%"
          inverseTrend
        />
        <StatCard 
          title="FULL 库容健康度" 
          value={skuData.length > 0 ? `${Math.min(100, Math.floor((1 - skuData.filter(s=>s.stock < (s.avgSalesSinceListing||1) * STOCK_HEALTH_THRESHOLD).length / (skuData.length || 1)) * 100))}%` : '0%'}
          trend={{ value: '-', isUp: true }}
          icon={<Package className="w-5 h-5 text-blue-500" />}
          description={skuData.length > 0 ? `SKU数: ${skuData.length}` : '暂无数据'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-border shadow-sm bg-card rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">销售与广告趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D5CFE" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2D5CFE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="totalSales" stroke="#2D5CFE" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} name="销售额" />
                <Area type="monotone" dataKey="adSpend" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} name="广告费" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SKU Table Panel */}
        <Card className="lg:col-span-1 border-border shadow-sm bg-card rounded-xl overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">重点 SKU 监控</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEditSku(null)}>
              <PlusCircle className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px] uppercase tracking-wider h-10">SKU (名称)</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider h-10">采购/售价</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider h-10">单品利润</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider h-10">库存/DOH</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider h-10 text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuData.slice(0, 6).map((sku) => {
                  const avgSales = sku.avgSalesSinceListing || 0.1;
                  const doh = Math.floor(sku.stock / avgSales);
                  const isLowStock = doh < STOCK_HEALTH_THRESHOLD;
                  return (
                    <TableRow 
                      key={sku.sku} 
                      className="hover:bg-slate-50/50 cursor-pointer h-12"
                      onClick={() => onEditSku(sku)}
                    >
                      <TableCell className="py-2">
                        <div className="font-mono text-primary text-xs">{sku.sku}</div>
                        <div className="text-[10px] text-text-sub truncate max-w-[100px]">{sku.skuName}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div className="text-slate-500">¥{sku.purchasePrice || 0}</div>
                        <div className="font-medium">${sku.sellingPrice || 0}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div className="text-emerald-600 font-bold">${sku.unitProfitExclAds || 0}</div>
                        <div className="text-[9px] text-text-sub">不含广告</div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div>{sku.stock}</div>
                        <span className={`status-pill ${isLowStock ? 'pill-danger' : 'pill-success'} text-[9px] px-1 py-0`}>
                          {doh}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {isLowStock ? (
                          <Badge variant="destructive" className="text-[9px] h-5">补货</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] h-5">健康</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border-border shadow-sm bg-card rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-semibold">核心竞品动态 (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {skuData.length > 0 ? (
                skuData.flatMap(sku => sku.competitors || []).slice(0, 3).map((comp, i) => (
                  <div key={i} className="text-[11px] border-l-2 border-primary pl-2">
                    <strong className="text-text-main">{comp.name || '未命名'}</strong><br />
                    价格: ${comp.currentPrice} | 评分: {comp.rating}★<br />
                    评论数: {comp.reviewCount}
                  </div>
                ))
              ) : (
                <div className="text-text-sub text-[11px] col-span-3 py-4 text-center">暂无竞品数据，请先录入 SKU 数据</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-border shadow-sm bg-card rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-semibold">今日待办事项</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-[11px] space-y-2 text-text-sub">
              <li className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-border" /> 回复 {latestStats.questions} 条售前问询
              </li>
              <li className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-border" /> 处理 {latestStats.claims} 条退款纠纷 (剩余 4h)
              </li>
              <li className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-border" /> 确认补货发票上传
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
