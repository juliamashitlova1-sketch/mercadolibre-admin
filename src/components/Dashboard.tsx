import { useState, useEffect, useCallback, Component } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, 
  AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert,
  ArrowUpRight, ArrowDownRight, RefreshCw, PlusCircle, ExternalLink, Plus, History,
  Save, Pencil, PackageOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, addDays, startOfToday, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { DailyStats, SKUStats, CalculatedMetrics, Claim, OperationLog } from '../types';
import { DEFAULT_EXCHANGE_RATE, STOCK_HEALTH_THRESHOLD, SLOW_STOCK_THRESHOLD } from '../constants';
import DataEntry from './DataEntry';
import SKUEntry from './SKUEntry';
import ClaimEntry from './ClaimEntry';
import OperationEntry from './OperationEntry';

function Sidebar({ activeView, onViewChange, skuData, onAddSku, isSkuFormOpen, onToggleSkuForm }: { 
  activeView: string, 
  onViewChange: (view: string) => void, 
  skuData?: SKUStats[], 
  onAddSku: () => void,
  isSkuFormOpen: boolean,
  onToggleSkuForm: () => void,
}) {
  const inventoryStatus = skuData && skuData.length > 0
    ? skuData.filter(s => Math.floor(s.stock / (s.avgSalesSinceListing || 1)) < STOCK_HEALTH_THRESHOLD).length > 0
      ? '需补货'
      : '正常'
    : '空';
  const menuItems = [
    { id: 'dashboard', label: '核心大盘仪表盘' },
    { id: 'sku-manage', label: 'SKU 每日管理' },
    { id: 'orders', label: '订单与销售明细' },
    { id: 'inventory', label: `库存与供应链 (${inventoryStatus})` },
    { id: 'ads', label: '广告分析与调优' },
    { id: 'competitors', label: '竞品监控中心' },
    { id: 'finance', label: '财务与结算台账' },
    { id: 'health', label: '账号申诉/纠纷处理' },
    { id: 'operations', label: '运营操作日志' },
  ];

  return (
    <aside className="w-[200px] bg-sidebar text-white flex flex-col py-5 shrink-0 hidden md:flex">
      <div className="px-6 pb-8 font-extrabold text-lg text-[#FFDB15] tracking-tighter">
        MERCADO MX OPS
      </div>
      <nav className="flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-6 py-3 text-[13px] transition-all text-left ${
              activeView === item.id 
                ? 'bg-[#334155] text-white border-r-4 border-primary' 
                : 'text-[#94A3B8] hover:text-white hover:bg-[#334155]/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* 新增 SKU 数据 - 可展开面板 */}
      <div className="border-t border-white/10">
        <button
          onClick={onToggleSkuForm}
          className="w-full flex items-center justify-between px-6 py-3 text-[13px] font-medium text-[#94A3B8] hover:text-white hover:bg-[#334155]/50 transition-all"
        >
          <span className="flex items-center gap-2.5">
            <PlusCircle className={`w-4 h-4 transition-transform ${isSkuFormOpen ? 'rotate-45' : ''}`} />
            新增 SKU 数据
          </span>
          <span className={`text-[10px] transition-transform ${isSkuFormOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        
        {isSkuFormOpen && (
          <div className="px-4 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* 简化版 SKU 快速录入表单 */}
            <QuickSkuForm onSubmit={onAddSku} />
          </div>
        )}
      </div>
      <div className="mt-auto px-6 py-6 text-[11px] text-text-sub">
        主管: Juan Carlos<br />
        最后同步: {format(new Date(), 'HH:mm:ss')}
      </div>
    </aside>
  );
}

// Mock Data for initial view
const MOCK_DAILY_STATS: DailyStats[] = Array.from({ length: 14 }).map((_, i) => ({
  date: format(subDays(startOfToday(), 13 - i), 'yyyy-MM-dd'),
  totalSales: 50000 + Math.random() * 20000,
  totalOrders: 150 + Math.floor(Math.random() * 50),
  adSpend: 8000 + Math.random() * 2000,
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  questions: 5,
  claims: 2,
  reputation: 'green'
}));

const MOCK_SKU_STATS: SKUStats[] = [
  { 
    sku: 'SKU-A001', 
    skuName: '蓝牙耳机-黑色', 
    date: '2024-04-15', 
    sales: 12000, 
    orders: 40, 
    stock: 450, 
    avgSalesSinceListing: 35, 
    slowStock: 10, 
    adSpend: 1800, 
    impressions: 50000, 
    clicks: 1200, 
    cpc: 1.5, 
    roas: 6.67, 
    acos: 15, 
    adOrders: 15, 
    purchasePrice: 45, 
    sellingPrice: 349, 
    unitProfitExclAds: 120, 
    inTransitStock: 200, 
    inProductionStock: 500, 
    leadTimeDays: 15,
    competitors: [
      { id: 'c1', name: 'Vendedor_A', url: 'https://articulo.mercadolibre.com.mx/MLM-1', currentPrice: 459, reviewCount: 1250, rating: 4.8, lastUpdated: '2024-04-15' },
      { id: 'c2', name: 'Vendedor_B', url: 'https://articulo.mercadolibre.com.mx/MLM-2', currentPrice: 420, reviewCount: 840, rating: 4.5, lastUpdated: '2024-04-15' }
    ]
  },
  { 
    sku: 'SKU-B002', 
    skuName: '无线充电器-白色', 
    date: '2024-04-15', 
    sales: 8500, 
    orders: 25, 
    stock: 120, 
    avgSalesSinceListing: 22, 
    slowStock: 45, 
    adSpend: 1200, 
    impressions: 30000, 
    clicks: 800, 
    cpc: 1.5, 
    roas: 7.08, 
    acos: 14.1, 
    adOrders: 10, 
    purchasePrice: 35, 
    sellingPrice: 399, 
    unitProfitExclAds: 150, 
    inTransitStock: 0, 
    inProductionStock: 300, 
    leadTimeDays: 10,
    competitors: [
      { id: 'c3', name: 'Vendedor_C', url: 'https://articulo.mercadolibre.com.mx/MLM-3', currentPrice: 499, reviewCount: 2100, rating: 4.2, lastUpdated: '2024-04-15' }
    ]
  },
  { sku: 'SKU-C003', skuName: '智能手表-运动版', date: '2024-04-15', sales: 15000, orders: 55, stock: 800, avgSalesSinceListing: 50, slowStock: 0, adSpend: 2500, impressions: 80000, clicks: 2500, cpc: 1.0, roas: 6.0, acos: 16.7, adOrders: 25, purchasePrice: 60, sellingPrice: 299, unitProfitExclAds: 90, inTransitStock: 1000, inProductionStock: 0, leadTimeDays: 20, competitors: [] },
  { sku: 'SKU-D004', skuName: '手机壳-透明', date: '2024-04-15', sales: 4200, orders: 12, stock: 50, avgSalesSinceListing: 10, slowStock: 20, adSpend: 900, impressions: 15000, clicks: 450, cpc: 2.0, roas: 4.67, acos: 21.4, adOrders: 5, purchasePrice: 5, sellingPrice: 450, unitProfitExclAds: 200, inTransitStock: 0, inProductionStock: 0, leadTimeDays: 7, competitors: [] },
];

function OrdersView({ dailyData, skuData }: { dailyData: DailyStats[], skuData: SKUStats[] }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">订单与销售明细</h2>
        <p className="text-text-sub text-sm">追踪每日订单总量、单品出单分布及销售转化</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">今日总订单量</div>
          <div className="stat-value">{dailyData[dailyData.length - 1]?.totalOrders || 0} <span className="text-xs font-normal text-text-sub">单</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">今日客单价 (AOV)</div>
          <div className="stat-value text-primary">
            ${((dailyData[dailyData.length - 1]?.totalSales || 0) / (dailyData[dailyData.length - 1]?.totalOrders || 1)).toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">出单 SKU 数</div>
          <div className="stat-value text-success">{skuData.filter(s => s.orders > 0).length}</div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">今日单品出单排行</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>SKU 信息</TableHead>
                <TableHead>当日销量 (MXN)</TableHead>
                <TableHead>当日订单 (单)</TableHead>
                <TableHead>单品贡献度</TableHead>
                <TableHead className="text-right">转化率 (估)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skuData
                .filter(s => s.orders > 0)
                .sort((a, b) => b.orders - a.orders)
                .map((sku) => {
                  const totalOrders = dailyData[dailyData.length - 1]?.totalOrders || 1;
                  const contribution = (sku.orders / totalOrders) * 100;
                  const conversion = (sku.orders / (sku.clicks || 1)) * 100;
                  return (
                    <TableRow key={sku.sku}>
                      <TableCell>
                        <div className="font-mono text-xs font-bold">{sku.sku}</div>
                        <div className="text-[10px] text-text-sub">{sku.skuName}</div>
                      </TableCell>
                      <TableCell className="text-xs">${sku.sales.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-bold">{sku.orders}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${contribution}%` }} />
                          </div>
                          <span className="text-[10px] w-8">{contribution.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {conversion.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AdsView({ skuData, dailyData }: { skuData: SKUStats[], dailyData: DailyStats[] }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">广告分析与调优 (Mercado Ads)</h2>
        <p className="text-text-sub text-sm">监控广告投放效果，优化 ACOS 与关键词竞价</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">今日总广告费</div>
          <div className="stat-value">${dailyData.length > 0 ? dailyData.reduce((s, d) => s + d.adSpend, 0).toLocaleString() : '0'} <span className="text-xs font-normal text-text-sub">MXN</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 ACOS</div>
          <div className="stat-value text-primary">{dailyData.length > 0 ? ((dailyData.reduce((s,d)=>s+d.adSpend,0) / dailyData.reduce((s,d)=>s+d.totalSales,1)) * 100).toFixed(1) : '0'}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 ROAS</div>
          <div className="stat-value text-success">{dailyData.length > 0 ? (dailyData.reduce((s,d)=>s+d.totalSales,0) / (dailyData.reduce((s,d)=>s+d.adSpend,0)||1)).toFixed(2) : '0'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均 CTR</div>
          <div className="stat-value">{skuData.length > 0 ? ((skuData.reduce((s,d)=>s+(d.clicks||0),0) / (skuData.reduce((s,d)=>s+(d.impressions||0),0)||1)) * 100).toFixed(1) : '0'}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border shadow-sm bg-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">广告费 vs 销售额趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalSales" stroke="#2D5CFE" strokeWidth={2} name="销售额" />
                <Line type="monotone" dataKey="adSpend" stroke="#f59e0b" strokeWidth={2} name="广告费" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">单品广告表现</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px]">SKU (名称)</TableHead>
                  <TableHead className="text-[11px]">曝光/点击</TableHead>
                  <TableHead className="text-[11px]">CPC</TableHead>
                  <TableHead className="text-[11px]">ACOS</TableHead>
                  <TableHead className="text-[11px]">ROAS</TableHead>
                  <TableHead className="text-[11px]">广告订单</TableHead>
                  <TableHead className="text-[11px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuData.map((sku) => {
                  return (
                    <TableRow key={sku.sku}>
                      <TableCell>
                        <div className="font-mono text-xs">{sku.sku}</div>
                        <div className="text-[10px] text-text-sub truncate max-w-[80px]">{sku.skuName}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{sku.impressions.toLocaleString()}</div>
                        <div className="text-text-sub">{sku.clicks.toLocaleString()} ({((sku.clicks / sku.impressions) * 100).toFixed(1)}%)</div>
                      </TableCell>
                      <TableCell className="text-xs">${sku.cpc}</TableCell>
                      <TableCell className={`text-xs ${sku.acos > 25 ? 'text-danger' : 'text-success'}`}>
                        {sku.acos}%
                      </TableCell>
                      <TableCell className="text-xs">{sku.roas}</TableCell>
                      <TableCell className="text-xs">{sku.adOrders}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]">调整竞价</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompetitorView({ skuData, onEditSku }: { skuData: SKUStats[], onEditSku: (sku: SKUStats) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-main">竞品监控中心</h2>
          <p className="text-text-sub text-sm">追踪每个 SKU 对应的核心竞品价格、评价与排名动态</p>
        </div>
        <div className="text-xs text-text-sub bg-slate-100 px-3 py-1 rounded-full">
          提示: 点击 SKU 可快速更新竞品数据
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {skuData.map((sku) => (
          <Card key={sku.sku} className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary font-mono text-xs px-2 py-1 rounded">
                  {sku.sku}
                </div>
                <CardTitle className="text-sm font-bold">{sku.skuName}</CardTitle>
                <div className="text-xs text-text-sub">
                  我的售价: <span className="font-bold text-text-main">${sku.sellingPrice}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px]"
                onClick={() => onEditSku(sku)}
              >
                更新竞品数据
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[11px] h-8">竞品名称/链接</TableHead>
                    <TableHead className="text-[11px] h-8">当前售价</TableHead>
                    <TableHead className="text-[11px] h-8">价格差</TableHead>
                    <TableHead className="text-[11px] h-8">评价数量</TableHead>
                    <TableHead className="text-[11px] h-8">评分</TableHead>
                    <TableHead className="text-[11px] h-8 text-right">最后更新</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sku.competitors && sku.competitors.length > 0 ? (
                    sku.competitors.map((comp) => {
                      const priceDiff = sku.sellingPrice - comp.currentPrice;
                      return (
                        <TableRow key={comp.id} className="h-10">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{comp.name || '未命名竞品'}</span>
                              {comp.url && (
                                <a href={comp.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">${comp.currentPrice}</TableCell>
                          <TableCell className="text-xs">
                            <span className={priceDiff > 0 ? 'text-danger' : 'text-success'}>
                              {priceDiff > 0 ? `比我便宜 $${priceDiff.toFixed(1)}` : `比我贵 $${Math.abs(priceDiff).toFixed(1)}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{comp.reviewCount}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-bold">{comp.rating}</span>
                              <span className="text-amber-400">★</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[10px] text-text-sub">
                            {comp.lastUpdated}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-xs text-text-sub italic">
                        暂无监控竞品，点击右上角“更新竞品数据”添加
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FinanceView({ dailyData }: { dailyData: DailyStats[] }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">财务与结算台账</h2>
        <p className="text-text-sub text-sm">每日盈亏核算、汇率监控与利润分析</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">本月累计净利润 (估算)</div>
          <div className="stat-value text-success">${dailyData.length > 0 ? dailyData.reduce((s,d)=>s+((d.totalSales*0.3)-d.adSpend),0).toLocaleString() : '0'} <span className="text-xs font-normal text-text-sub">MXN</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均利润率</div>
          <div className="stat-value">{dailyData.length > 0 ? ((dailyData.reduce((s,d)=>s+((d.totalSales*0.3)-d.adSpend),0) / dailyData.reduce((s,d)=>s+d.totalSales,1)) * 100).toFixed(1) : '0'}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">实时汇率 (MXN/CNY)</div>
          <div className="stat-value text-primary">{DEFAULT_EXCHANGE_RATE}</div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">每日财务明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>总销售额 (MXN)</TableHead>
                <TableHead>广告支出 (MXN)</TableHead>
                <TableHead>预估净利润 (MXN)</TableHead>
                <TableHead>利润率</TableHead>
                <TableHead className="text-right">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyData.slice().reverse().map((day) => {
                const profit = day.calculatedProfit !== undefined ? day.calculatedProfit : (day.totalSales * 0.3 - day.adSpend);
                const margin = profit / (day.totalSales || 1);
                return (
                  <TableRow key={day.date}>
                    <TableCell className="text-xs">{day.date}</TableCell>
                    <TableCell className="text-xs font-medium">${day.totalSales.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-rose-500">-${day.adSpend.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${profit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{(margin * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-[9px]">
                        {day.calculatedProfit !== undefined ? '精准核算' : '估算'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthView({ latestStats, claims, onAddClaim }: { latestStats: DailyStats, claims: Claim[], onAddClaim: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-main">账号申诉/纠纷处理</h2>
          <p className="text-text-sub text-sm">监控店铺信誉、处理退款纠纷与申诉记录</p>
        </div>
        <Button onClick={onAddClaim} className="gap-2">
          <Plus className="w-4 h-4" /> 记录新纠纷
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border shadow-sm bg-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <div className="text-xs text-text-sub font-medium">店铺信誉状态</div>
            <div className="text-xl font-bold text-success">Verde (极佳)</div>
          </div>
        </Card>
        <Card className="border-border shadow-sm bg-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <div className="text-xs text-text-sub font-medium">待处理纠纷 (Reclamos)</div>
            <div className="text-xl font-bold text-danger">{latestStats.claims}</div>
          </div>
        </Card>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">近期纠纷处理记录</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">共 {claims.length} 条记录</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[11px] h-10">订单号</TableHead>
                <TableHead className="text-[11px] h-10">商品名称</TableHead>
                <TableHead className="text-[11px] h-10">诉求</TableHead>
                <TableHead className="text-[11px] h-10">处理方式</TableHead>
                <TableHead className="text-[11px] h-10">处理时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length > 0 ? (
                claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="text-xs font-mono font-medium">{claim.orderId}</TableCell>
                    <TableCell className="text-xs">{claim.productName}</TableCell>
                    <TableCell className="text-xs text-danger">{claim.request}</TableCell>
                    <TableCell className="text-xs font-medium text-emerald-600">{claim.handlingMethod}</TableCell>
                    <TableCell className="text-xs text-text-sub">{claim.handlingTime}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-text-sub text-xs">
                    暂无纠纷记录，点击上方按钮添加
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function OperationView({ logs, skuData, onAddLog }: { logs: OperationLog[], skuData: SKUStats[], onAddLog: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-main">运营操作日志</h2>
          <p className="text-text-sub text-sm">记录 SKU 的调价、改图等关键操作，回溯运营效果</p>
        </div>
        <Button onClick={onAddLog} className="gap-2">
          <Plus className="w-4 h-4" /> 记录新操作
        </Button>
      </header>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">操作历史记录</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">共 {logs.length} 条记录</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[11px] h-10">操作日期</TableHead>
                <TableHead className="text-[11px] h-10">SKU</TableHead>
                <TableHead className="text-[11px] h-10">类型</TableHead>
                <TableHead className="text-[11px] h-10">操作详情</TableHead>
                <TableHead className="text-[11px] h-10">记录时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium">{log.date}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-primary">{log.sku}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {log.actionType === 'Price' ? '调价' : 
                         log.actionType === 'Image' ? '改图' : 
                         log.actionType === 'Ads' ? '广告' : 
                         log.actionType === 'Title' ? '标题' : 
                         log.actionType === 'Stock' ? '库存' : '其他'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[400px] whitespace-pre-wrap">{log.description}</TableCell>
                    <TableCell className="text-xs text-text-sub">{format(parseISO(log.createdAt), 'MM/dd HH:mm')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-text-sub text-xs">
                    暂无操作记录，点击上方按钮开始记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [skuData, setSkuData] = useState<SKUStats[]>([]);
  const [skuRefreshKey, setSkuRefreshKey] = useState(0);

  // Fetch SKU stats function (extracted for reuse)
  const refreshSkuData = useCallback(async () => {
    const { data, error } = await supabase
      .from('sku_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(200);
    if (error) { console.error('Error fetching SKU stats:', error); return; }
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      sku: row.sku,
      skuName: row.sku_name || '',
      date: row.date,
      sales: row.sales || 0,
      orders: row.orders || 0,
      stock: row.stock || 0,
      avgSalesSinceListing: row.avg_sales_since_listing || 0,
      slowStock: row.slow_stock || 0,
      adSpend: row.ad_spend || 0,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      cpc: row.cpc || 0,
      roas: row.roas || 0,
      acos: row.acos || 0,
      adOrders: row.ad_orders || 0,
      purchasePrice: row.purchase_price || 0,
      sellingPrice: row.selling_price || 0,
      unitProfitExclAds: row.unit_profit_excl_ads || 0,
      inTransitStock: row.in_transit_stock || 0,
      inProductionStock: row.in_production_stock || 0,
      leadTimeDays: row.lead_time_days || 7,
      competitors: row.competitors || [],
    }));
    const latestPerSku: Record<string, SKUStats> = {};
    mapped.forEach(item => {
      if (!latestPerSku[item.sku] || parseISO(item.date) > parseISO(latestPerSku[item.sku].date)) {
        latestPerSku[item.sku] = item;
      }
    });
    setSkuData(Object.values(latestPerSku));
  }, []);

  // Initial load + auto-refresh on key change
  useEffect(() => { refreshSkuData(); }, [refreshSkuData, skuRefreshKey]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isSkuEntryOpen, setIsSkuEntryOpen] = useState(false);
  const [isClaimEntryOpen, setIsClaimEntryOpen] = useState(false);
  const [isOperationEntryOpen, setIsOperationEntryOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKUStats | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSkuFormOpen, setIsSkuFormOpen] = useState(false);
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

  // Fetch daily stats
  useEffect(() => {
    const fetchDailyStats = async () => {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: true })
        .limit(30);
      if (error) {
        console.error('Error fetching daily stats:', error);
        setLoading(false);
        return;
      }
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        totalSales: row.total_sales || 0,
        totalOrders: row.total_orders || 0,
        adSpend: row.ad_spend || 0,
        exchangeRate: row.exchange_rate || 0.35,
        questions: row.questions || 0,
        claims: row.claims || 0,
        reputation: row.reputation || 'green',
        calculatedProfit: row.calculated_profit,
      }));
      setDailyData(mapped);
      setLoading(false);
    };
    fetchDailyStats();
    const channel = supabase.channel('daily-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, () => fetchDailyStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch claims
  useEffect(() => {
    const fetchClaims = async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) {
        setClaims((data || []).map((row: any) => ({
          id: row.id,
          orderId: row.order_number || '',
          request: row.reason?.split('|')[0] || '',
          productName: '',
          handlingMethod: row.reason?.split('|')[1]?.trim().split('@')[0] || '',
          handlingTime: row.reason?.split('@')[1]?.trim() || '',
          createdAt: row.created_at,
          status: row.status,
        })) as Claim[]);
      }
    };
    fetchClaims();
    const channel = supabase.channel('claims-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchClaims())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch operation logs
  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('operation_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (!error) {
        setOperationLogs((data || []).map((row: any) => ({
          id: row.id,
          date: row.date,
          action: row.action,
          sku: row.sku,
          details: row.details,
          createdAt: row.created_at,
        })) as OperationLog[]);
      }
    };
    fetchLogs();
    const channel = supabase.channel('operation-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operation_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const calculateMetrics = (stats: DailyStats, skus: SKUStats[]): CalculatedMetrics => {
    const aov = stats.totalSales / stats.totalOrders;
    const acos = stats.adSpend / stats.totalSales;
    const tacos = stats.adSpend / stats.totalSales; // Total Ad Spend / Total Sales
    const roas = stats.totalSales / stats.adSpend;
    
    // Improved Profit calculation using SKU-level unit profits if available
    // Otherwise fallback to 30% margin
    let profit = 0;
    if (skus.length > 0) {
      const skuProfitBeforeAds = skus.reduce((sum, sku) => sum + (sku.orders * (sku.unitProfitExclAds || 0)), 0);
      profit = skuProfitBeforeAds - stats.adSpend;
    } else {
      profit = stats.totalSales * 0.3 - stats.adSpend;
    }
    
    const profitMargin = profit / stats.totalSales;
    
    return { aov, acos, tacos, roas, doh: 0, profit, profitMargin };
  };

  const metrics = calculateMetrics(latestStats, skuData);
  const prevMetrics = calculateMetrics(prevStats, []); // Fallback for previous

  const getTrend = (current: number, previous: number) => {
    const diff = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(diff).toFixed(1) + '%',
      isUp: diff > 0,
      color: diff > 0 ? 'text-emerald-500' : 'text-rose-500'
    };
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        skuData={skuData} 
        onAddSku={() => { setSelectedSku(null); setIsSkuEntryOpen(true); }}
        isSkuFormOpen={isSkuFormOpen}
        onToggleSkuForm={() => setIsSkuFormOpen(!isSkuFormOpen)}
      />
      <ErrorBoundary>
      <main className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto">
        {activeView === 'dashboard' ? (
          <>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <span className="text-[12px] bg-border px-3 py-1 rounded-full text-text-sub">
                  MXN/CNY: {latestStats.exchangeRate}
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
                <Button 
                  size="sm"
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={() => setIsEntryOpen(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  录入今日数据
                </Button>
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
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedSku(null);
                    setIsSkuEntryOpen(true);
                  }}>
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
                            onClick={() => {
                              setSelectedSku(sku);
                              setIsSkuEntryOpen(true);
                            }}
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
        ) : activeView === 'sku-manage' ? (
          <SkuManageView 
            skuData={skuData}
            onSaveSuccess={() => setSkuRefreshKey(k => k + 1)}
            onOpenFullEntry={(sku) => { setSelectedSku(sku); setIsSkuEntryOpen(true); }}
          />
        ) : activeView === 'orders' ? (
          <OrdersView dailyData={dailyData} skuData={skuData} />
        ) : activeView === 'inventory' ? (
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-2xl font-bold text-text-main">库存与供应链 (FULL)</h2>
              <p className="text-text-sub text-sm">监控 FULL 仓库存健康度与补货建议</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-label">总库存价值</div>
                <div className="stat-value">${skuData.length > 0 ? skuData.reduce((s,sku)=>s+(sku.stock*sku.purchasePrice),0).toLocaleString() : '0'} <span className="text-xs font-normal text-text-sub">MXN</span></div>
              </div>
              <div className="stat-card">
                <div className="stat-label">需补货 SKU</div>
                <div className="stat-value text-danger">{skuData.length > 0 ? skuData.filter(sku => Math.floor(sku.stock / (sku.avgSalesSinceListing || 1)) < STOCK_HEALTH_THRESHOLD).length : '0'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">滞销 SKU (&gt;60d)</div>
                <div className="stat-value text-warning">{skuData.length > 0 ? skuData.filter(sku => Math.floor(sku.stock / (sku.avgSalesSinceListing || 1)) > SLOW_STOCK_THRESHOLD).length : '0'}</div>
              </div>
            </div>

            <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">供应链全链路追踪 (Supply Chain Pipeline)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>SKU (名称)</TableHead>
                      <TableHead>FULL 库存</TableHead>
                      <TableHead>在途 (Transit)</TableHead>
                      <TableHead>生产中 (Prod)</TableHead>
                      <TableHead>DOH (可用天)</TableHead>
                      <TableHead>断货预警日</TableHead>
                      <TableHead>补货建议</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skuData.map((sku) => {
                      const avgSales = sku.avgSalesSinceListing || 0.1; // Avoid division by zero
                      const doh = Math.floor(sku.stock / avgSales);
                      const totalPipeline = sku.stock + (sku.inTransitStock || 0) + (sku.inProductionStock || 0);
                      const pipelineDoh = Math.floor(totalPipeline / avgSales);
                      
                      // Calculate out of stock date
                      const oosDate = addDays(new Date(), doh);
                      const leadTimeWarningDate = subDays(oosDate, sku.leadTimeDays || 7);
                      const isUrgent = doh < (sku.leadTimeDays || 7);

                      return (
                        <TableRow key={sku.sku}>
                          <TableCell>
                            <div className="font-mono text-primary">{sku.sku}</div>
                            <div className="text-xs text-text-sub">{sku.skuName}</div>
                          </TableCell>
                          <TableCell className="font-medium">{sku.stock}</TableCell>
                          <TableCell className="text-blue-600">+{sku.inTransitStock || 0}</TableCell>
                          <TableCell className="text-slate-500">+{sku.inProductionStock || 0}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={`status-pill ${doh < 15 ? 'pill-danger' : 'pill-success'}`}>
                                FULL: {doh} 天
                              </span>
                              <span className="text-[10px] text-text-sub mt-1">
                                总链路: {pipelineDoh} 天
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`text-xs font-bold ${isUrgent ? 'text-danger' : 'text-slate-600'}`}>
                              {format(leadTimeWarningDate, 'MM/dd')}
                              {isUrgent && <div className="text-[9px] font-normal">已逾期!</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {doh < (sku.leadTimeDays || 7) ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="destructive" className="text-[10px] w-fit">紧急补货</Badge>
                                <span className="text-[10px] text-danger">建议: {Math.ceil(sku.avgSalesSinceListing * 30)} 件</span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] w-fit">库存充足</Badge>
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
        ) : activeView === 'ads' ? (
          <AdsView skuData={skuData} dailyData={dailyData} />
        ) : activeView === 'competitors' ? (
          <CompetitorView 
            skuData={skuData} 
            onEditSku={(sku) => {
              setSelectedSku(sku);
              setIsSkuEntryOpen(true);
            }} 
          />
        ) : activeView === 'finance' ? (
          <FinanceView dailyData={dailyData} />
        ) : activeView === 'health' ? (
          <HealthView 
            latestStats={latestStats} 
            claims={claims} 
            onAddClaim={() => setIsClaimEntryOpen(true)} 
          />
        ) : activeView === 'operations' ? (
          <OperationView 
            logs={operationLogs} 
            skuData={skuData}
            onAddLog={() => setIsOperationEntryOpen(true)} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-sub">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold mb-2">正在开发中...</h2>
            <p className="text-sm">视图: {activeView} 模块即将上线</p>
            <Button 
              variant="link" 
              onClick={() => setActiveView('dashboard')}
              className="mt-4 text-primary"
            >
              返回核心大盘
            </Button>
          </div>
        )}

        <DataEntry 
          open={isEntryOpen} 
          onOpenChange={setIsEntryOpen} 
          skuData={skuData}
          onSuccess={() => {
            console.log('Data saved successfully');
          }} 
        />

        <SKUEntry 
          open={isSkuEntryOpen}
          onOpenChange={setIsSkuEntryOpen}
          sku={selectedSku}
          onSuccess={() => {
            console.log('SKU Data saved successfully');
          }}
        />

        <ClaimEntry
          open={isClaimEntryOpen}
          onOpenChange={setIsClaimEntryOpen}
          onSuccess={() => {
            console.log('Claim saved successfully');
          }}
        />

        <OperationEntry
          open={isOperationEntryOpen}
          onOpenChange={setIsOperationEntryOpen}
          skuData={skuData}
          onSuccess={() => {
            console.log('Operation log saved successfully');
          }}
        />
      </main>
      </ErrorBoundary>
    </div>
  );
}

function StatCard({ title, value, trend, icon, description, inverseTrend = false }: any) {
  const isPositiveTrend = trend.isUp;
  const isGoodTrend = inverseTrend ? !isPositiveTrend : isPositiveTrend;
  const trendColor = isGoodTrend ? 'text-success' : 'text-danger';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="stat-card"
    >
      <div className="flex justify-between items-start mb-1">
        <div className="stat-label">{title}</div>
        <div className="p-1.5 bg-bg rounded-lg">{icon}</div>
      </div>
      <div className="stat-value">
        {value} <span className="text-[12px] text-text-sub font-normal ml-1">{description.includes('MXN') ? 'MXN' : ''}</span>
      </div>
      <div className={`stat-change ${trendColor}`}>
        {isPositiveTrend ? '↑' : '↓'} {trend.value} <span className="text-text-sub ml-1">vs 昨日</span>
      </div>
      {!description.includes('MXN') && (
        <div className="text-[10px] text-text-sub mt-2 font-medium uppercase tracking-tight">
          {description}
        </div>
      )}
    </motion.div>
  );
}

function RankItem({ keyword, rank, prevRank }: { keyword: string, rank: number, prevRank: number }) {
  const diff = prevRank - rank; // Positive means rank improved (smaller number)
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-600">{keyword}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-900">#{rank}</span>
        {diff !== 0 && (
          <div className={`flex items-center text-[10px] font-bold ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(diff)}
          </div>
        )}
      </div>
    </div>
  );
}

// SKU 每日管理页面 - 两步流程：先建SKU档案，再填每日数据
function SkuManageView({ skuData, onSaveSuccess }: { 
  skuData: SKUStats[], 
  onSaveSuccess: () => void,
}) {
  // 步骤状态: 'list' = SKU列表, 'new' = 新建SKU, 'daily' = 填写每日数据
  const [step, setStep] = useState<'list' | 'new' | 'daily'>('list');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [skuList, setSkuList] = useState<{sku: string; name: string; purchasePrice: string}[]>([]);
  
  // 加载已有 SKU 列表（去重）
  useEffect(() => {
    const unique = new Map<string, {sku: string; name: string; purchasePrice: string}>();
    skuData.forEach(s => {
      if (!unique.has(s.sku)) {
        unique.set(s.sku, { sku: s.sku, name: s.skuName || '', purchasePrice: String(s.purchasePrice || '') });
      }
    });
    setSkuList(Array.from(unique.values()));
  }, [skuData]);

  // ========== 步骤1：SKU列表页 ==========
  if (step === 'list') {
    return <SkuListView 
      skuList={skuList} 
      onCreateNew={() => setStep('new')} 
      onFillDaily={(sku) => { setSelectedSku(sku); setStep('daily'); }}
      onSaveSuccess={onSaveSuccess}
    />;
  }

  // ========== 步骤2：新建SKU ==========
  if (step === 'new') {
    return <CreateSkuView onBack={() => setStep('list')} onSuccess={() => setStep('list')} onSaveSuccess={onSaveSuccess} />;
  }

  // ========== 步骤3：填写每日数据 ==========
  if (step === 'daily') {
    return <DailyDataView 
      selectedSku={selectedSku} 
      onBack={() => setStep('list')}
      existingData={skuData.find(s => s.sku === selectedSku)}
      onSaveSuccess={onSaveSuccess}
    />;
  }

  return null;
}

// --- 子组件1：SKU列表 ---
function SkuListView({ skuList, onCreateNew, onFillDaily, onSaveSuccess }: {
  skuList: {sku: string; name: string; purchasePrice: string}[],
  onCreateNew: () => void, onFillDaily: (sku: string) => void, onSaveSuccess: () => void
}) {
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (sku: string) => {
    if (!confirm(`确认删除 SKU「${sku}」的所有记录？`)) return;
    setDeleting(sku);
    const { error } = await supabase.from('sku_stats').delete().like('doc_id', `${sku}_%`);
    if (error) setMsg(`删除失败: ${error.message}`);
    else { setMsg('已删除'); onSaveSuccess(); setTimeout(() => setMsg(''), 2000); }
    setDeleting(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-3 space-y-5">
      {/* 标题栏 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">SKU 每日管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理 SKU 档案并录入每日运营数据</p>
        </div>
        {msg && (
          <span className="ml-auto px-4 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{msg}</span>
        )}
      </div>

      {/* 操作按钮 */}
      <button onClick={onCreateNew}
        className="flex items-center gap-2 px-5 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
        <PlusCircle className="w-4 h-4" /> 新建 SKU 档案
      </button>

      {/* SKU 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skuList.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <PackageOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 font-medium">暂无 SKU 档案</p>
            <p className="text-sm text-slate-300 mt-1">点击上方按钮创建你的第一个 SKU</p>
          </div>
        ) : skuList.map(item => (
          <div key={item.sku}
            className="group bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-200 overflow-hidden">
            {/* 卡片头部 */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-base font-bold text-primary tracking-wide">{item.sku}</div>
                  <div className="text-sm text-slate-600 mt-0.5 truncate">{item.name || '未命名'}</div>
                </div>
                <div className="shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.sku); }} disabled={deleting === item.sku}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="删除此 SKU">✕
                  </button>
                </div>
              </div>
            </div>

            {/* 采购价标签 */}
            <div className="px-5 pb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                💰 采购价 ¥{Number(item.purchasePrice).toFixed(2)}
              </span>
            </div>

            {/* 底部操作区 */}
            <button onClick={() => onFillDaily(item.sku)}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-100 text-sm font-semibold text-blue-600 hover:from-blue-100 hover:to-indigo-100 transition-all flex items-center justify-center gap-2 group/btn">
              <span>填写今日数据</span>
              <span className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 子组件2：新建SKU档案 ---
function CreateSkuView({ onBack, onSuccess, onSaveSuccess }: {
  onBack: () => void, onSuccess: () => void, onSaveSuccess: () => void
}) {
  const [form, setForm] = useState({ sku: '', skuName: '', purchasePrice: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const inputCls = "w-full h-11 px-4 text-sm border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]";

  const handleSave = async () => {
    if (!form.sku.trim()) { setMsg('请输入SKU编码'); setMsgType('error'); return; }
    setSaving(true); setMsg('');
    try {
      const docId = `${form.sku.trim()}_${format(new Date(), 'yyyy-MM-dd')}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: form.sku.trim(),
        sku_name: form.skuName.trim() || '未命名',
        date: format(new Date(), 'yyyy-MM-dd'),
        purchase_price: Number(form.purchasePrice) || 0,
        sales: 0, orders: 0, stock: 0,
      }, { onConflict: 'doc_id' });
      if (error) throw error;
      setMsg('创建成功！'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto py-3 space-y-5">
      {/* 导航 */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
        ← 返回 SKU 列表
      </button>

      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <PlusCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">新建 SKU 档案</h2>
          <p className="text-xs text-slate-400 mt-0.5">填写基本信息后，即可开始每日数据录入</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="bg-gradient-to-b from-white to-emerald-50/20 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 space-y-6">
          <div>
            <label className="text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide">SKU 编码 *</label>
            <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
              className={`${inputCls} font-mono`} placeholder="例如: A16 / B07 / 蓝牙耳机Pro" autoFocus />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide">SKU 中文名称</label>
            <input value={form.skuName} onChange={e => setForm(p => ({ ...p, skuName: e.target.value }))}
              className={inputCls} placeholder="例如: 蓝牙耳机 Pro Max - 黑色" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide">
              采购价 <span className="font-normal text-slate-400">(元/CNY)</span>
            </label>
            <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))}
              className={inputCls} placeholder="例如: 25.00" />
          </div>

          {msg && (
            <div className={`px-4 py-2.5 rounded-xl text-sm text-center ${msgType === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {msgType === 'success' ? '✅ ' : '❌ '}{msg}
            </div>
          )}
        </div>

        <div className="px-8 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-t border-slate-200/60 flex justify-end gap-3">
          <button onClick={onBack}
            className="px-6 h-11 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`px-8 h-11 rounded-xl text-sm font-semibold transition-all ${
              saving ? 'bg-slate-300 text-slate-500' :
              'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:shadow-lg hover:shadow-emerald-200 active:scale-[0.98]'
            }`}>
            {saving ? '创建中...' : '创建 SKU'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 子组件3：每日数据录入 ---
function DailyDataView({ selectedSku, onBack, existingData, onSaveSuccess }: {
  selectedSku: string, onBack: () => void,
  existingData?: SKUStats, onSaveSuccess: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    sales: '', orders: '',
    stock: '', inTransitStock: '', inProductionStock: '',
    avgSalesSinceListing: '', leadTimeDays: '7', slowStock: '',
    sellingPrice: '', unitProfitExclAds: '',
    adSpend: '', impressions: '', clicks: '', adOrders: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  // 自动计算
  const imp = Number(form.impressions) || 0;
  const cli = Number(form.clicks) || 0;
  const spend = Number(form.adSpend) || 0;
  const salesVal = Number(form.sales) || 0;
  const autoCpc = spend > 0 && cli > 0 ? ((spend * 7.2) / cli).toFixed(2) + '美元' : '0.00美元';
  const autoRoas = spend > 0 && salesVal > 0 ? (salesVal / spend).toFixed(2) : '0.00';
  const autoAcos = spend > 0 && salesVal > 0 ? (spend / salesVal * 100).toFixed(2) + '%' : '0.00%';

  const inputCls = "w-full h-11 px-4 text-sm border-slate-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]";
  const autoInputCls = "w-full h-11 px-4 text-sm bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/50 rounded-xl font-mono tracking-wide";
  const labelCls = "text-[13px] font-semibold text-slate-600 mb-2 block tracking-wide";

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const docId = `${selectedSku}_${today}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: selectedSku,
        date: today,
        sales: Number(form.sales) || 0, orders: Number(form.orders) || 0,
        stock: Number(form.stock) || 0,
        in_transit_stock: Number(form.inTransitStock) || 0,
        in_production_stock: Number(form.inProductionStock) || 0,
        avg_sales_since_listing: Number(form.avgSalesSinceListing) || 0,
        lead_time_days: Number(form.leadTimeDays) || 7,
        slow_stock: Number(form.slowStock) || 0,
        selling_price: Number(form.sellingPrice) || 0,
        unit_profit_excl_ads: Number(form.unitProfitExclAds) || 0,
        ad_spend: Number(form.adSpend) || 0,
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0,
        ad_orders: Number(form.adOrders) || 0,
      }, { onConflict: 'doc_id' });
      if (error) throw error;

      // 写入自动计算字段
      const cpcNum = cli > 0 ? (spend * 7.2 / cli) : 0;
      const roasNum = salesVal > 0 ? (salesVal / spend) : 0;
      const acosNum = salesVal > 0 ? (spend / salesVal * 100) : 0;
      await supabase.from('sku_stats').update({ cpc: cpcNum, roas: roasNum, acos: acosNum }).eq('doc_id', docId);

      setMsg('保存成功！'); setMsgType('success');
      onSaveSuccess();
      setTimeout(() => { setMsg(''); }, 2500);
    } catch (err: any) { setMsg(err.message); setMsgType('error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto py-3 space-y-5">
      {/* 导航 */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
        ← 返回 SKU 列表
      </button>

      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <BarChart className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-[18px] font-bold text-slate-800">每日数据录入</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span className="font-mono font-bold text-primary">{selectedSku}</span>
            <span className="text-slate-300">|</span>
            <span>{existingData?.skuName || ''}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{today}</span>
          </div>
        </div>
        {msg && (
          <span className={`ml-auto px-4 py-2 rounded-lg text-xs font-medium ${
            msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>{msgType === 'success' ? '✅ ' : '❌ '}{msg}</span>
        )}
      </div>

      {/* 表单 */}
      <div className="bg-gradient-to-b from-white to-blue-50/20 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 pb-10 space-y-8">

          {/* 销售与库存 */}
          <section>
            <h3 className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center"><span className="text-indigo-600 text-xs font-bold">01</span></span>
              <span className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">销售与库存</span>
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div><label className={labelCls}>今日销售额（MXN）</label><input type="number" step="0.01" value={form.sales} onChange={e=>handleChange('sales',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>今日订单量</label><input type="number" value={form.orders} onChange={e=>handleChange('orders',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><label className={labelCls}>当前全部库存</label><input type="number" value={form.stock} onChange={e=>handleChange('stock',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>在途库存（在途）</label><input type="number" value={form.inTransitStock} onChange={e=>handleChange('inTransitStock',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>生产中库存（生产）</label><input type="number" value={form.inProductionStock} onChange={e=>handleChange('inProductionStock',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelCls}>上架至今均销</label><input type="number" step="0.001" value={form.avgSalesSinceListing} onChange={e=>handleChange('avgSalesSinceListing',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>头程时效（天）</label><input type="number" value={form.leadTimeDays} onChange={e=>handleChange('leadTimeDays',e.target.value)} className={inputCls} defaultValue="7"/></div>
              <div><label className={labelCls}>滞销库存（&gt;60d）</label><input type="number" value={form.slowStock} onChange={e=>handleChange('slowStock',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
          </section>

          <div className="border-t border-slate-200/60"/>

          {/* 财务成本 */}
          <section>
            <h3 className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><span className="text-amber-600 text-xs font-bold">02</span></span>
              <span className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">财务成本</span>
            </h3>
            <div className="grid grid-cols-3 gap-5">
              <div><label className={labelCls}>当时售价（MXN）</label><input type="number" step="0.01" value={form.sellingPrice} onChange={e=>handleChange('sellingPrice',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>单品利润-透明广告(MXN)</label><input type="number" step="0.01" value={form.unitProfitExclAds} onChange={e=>handleChange('unitProfitExclAds',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
          </section>

          <div className="border-t border-slate-200/60"/>

          {/* 广告与竞争 */}
          <section>
            <h3 className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><span className="text-emerald-600 text-xs font-bold">03</span></span>
              <span className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">广告与竞争</span>
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div><label className={labelCls}>广告消耗</label><input type="number" value={form.adSpend} onChange={e=>handleChange('adSpend',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>曝光</label><input type="number" value={form.impressions} onChange={e=>handleChange('impressions',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>点击</label><input type="number" value={form.clicks} onChange={e=>handleChange('clicks',e.target.value)} className={inputCls} placeholder="0"/></div>
              <div><label className={labelCls}>广告订单</label><input type="number" value={form.adOrders} onChange={e=>handleChange('adOrders',e.target.value)} className={inputCls} placeholder="0"/></div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] text-slate-400 mb-3 font-medium uppercase tracking-widest">自动计算指标</p>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-[11px] text-slate-400 font-medium mb-1 block">CPC <span className="text-[9px] text-slate-300">(自动)</span></label><input readOnly value={autoCpc} className={autoInputCls}/></div>
                <div><label className="text-[11px] text-slate-400 font-medium mb-1 block">ROAS <span className="text-[9px] text-slate-300">(自动)</span></label><input readOnly value={autoRoas} className={autoInputCls}/></div>
                <div><label className="text-[11px] text-slate-400 font-medium mb-1 block">ACOS % <span className="text-[9px] text-slate-300">(自动)</span></label><input readOnly value={autoAcos} className={autoInputCls}/></div>
              </div>
            </div>
          </section>
        </div>

        <div className="px-8 py-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-t border-slate-200/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">数据将同步至 Supabase 云端数据库</div>
          <button onClick={handleSave} disabled={saving}
            className={`px-10 h-12 rounded-xl text-sm font-semibold transition-all shadow-lg ${
              saving ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' :
              'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98]'
            }`}>
            {saving ? (<span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> 保存中...</span>) :
             (<span className="flex items-center gap-2"><Save className="w-4 h-4"/> 保 存</span>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// 侧边栏内的快速 SKU 录入表单
function QuickSkuForm({ onSubmit }: { onSubmit: () => void }) {
  const [sku, setSku] = useState('');
  const [skuName, setSkuName] = useState('');
  const [sales, setSales] = useState(0);
  const [orders, setOrders] = useState(0);
  const [stock, setStock] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim()) { setMsg('请输入SKU编码'); return; }
    setSaving(true); setMsg('');
    try {
      const docId = `${sku}_${format(new Date(), 'yyyy-MM-dd')}`;
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId, sku: sku.trim(), sku_name: skuName.trim(),
        date: format(new Date(), 'yyyy-MM-dd'),
        sales: Number(sales) || 0, orders: Number(orders) || 0,
        stock: Number(stock) || 0,
      }, { onConflict: 'doc_id' });
      if (error) throw error;
      setMsg('✅ 保存成功！');
      setSku(''); setSkuName(''); setSales(0); setOrders(0); setStock(0);
      onSubmit();
      setTimeout(() => setMsg(''), 2000);
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSave} className="space-y-2.5">
      <div>
        <label className="text-[10px] text-slate-400 block mb-0.5">SKU 编码 *</label>
        <input value={sku} onChange={e => setSku(e.target.value)}
          className="w-full h-7 px-2 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-white/30 focus:outline-none focus:border-primary"
          placeholder="A16" />
      </div>
      <div>
        <label className="text-[10px] text-slate-400 block mb-0.5">名称</label>
        <input value={skuName} onChange={e => setSkuName(e.target.value)}
          className="w-full h-7 px-2 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-white/30 focus:outline-none focus:border-primary"
          placeholder="蓝牙耳机-黑色" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">销售额</label>
          <input type="number" value={sales} onChange={e => setSales(Number(e.target.value))}
            className="w-full h-6 px-1.5 text-[11px] bg-white/10 border border-white/20 rounded text-white focus:outline-none" />
        </div>
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">订单</label>
          <input type="number" value={orders} onChange={e => setOrders(Number(e.target.value))}
            className="w-full h-6 px-1.5 text-[11px] bg-white/10 border border-white/20 rounded text-white focus:outline-none" />
        </div>
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">库存</label>
          <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))}
            className="w-full h-6 px-1.5 text-[11px] bg-white/10 border border-white/20 rounded text-white focus:outline-none" />
        </div>
      </div>
      {msg && <div className={`text-[10px] text-center py-1 ${msg.includes('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</div>}
      <button type="submit" disabled={saving}
        className="w-full h-8 bg-primary hover:bg-primary/90 text-white rounded text-xs font-medium disabled:opacity-50 transition-all">
        {saving ? '保存中...' : '保存'}
      </button>
      <p className="text-[9px] text-slate-500 text-center">快速录入，完整信息请在右侧编辑</p>
    </form>
  );
}

class ErrorBoundary extends Component<{children: any}, {hasError: boolean, error: string}> {
  constructor(props: {children: any}) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('Dashboard 渲染错误:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-lg text-center">
            <h3 className="text-red-600 font-bold text-lg mb-2">页面渲染出错</h3>
            <p className="text-red-500 text-sm mb-4 break-all">{this.state.error}</p>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-md text-sm"
              onClick={() => this.setState({ hasError: false, error: '' })}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
