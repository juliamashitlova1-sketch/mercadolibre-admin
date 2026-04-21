import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Plus, History } from 'lucide-react';
import { SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';
import { getMexicoDateString } from '../lib/time';
import DateRangeFilter, { filterByDateRange } from '../components/DateRangeFilter';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
  onEditSku: (sku: SKUStats, mode?: 'full' | 'competitors') => void;
}

export default function Competitors() {
  const { skuData, allSkuData, onEditSku } = useOutletContext<ContextType>();
  const todayStr = getMexicoDateString();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 筛选范围内每个 SKU 最新的快照（含竞品数据）
  const filteredSkuData = useMemo(() => {
    const filtered = filterByDateRange(allSkuData, startDate, endDate);
    const latestPerSku: Record<string, SKUStats> = {};
    filtered.forEach(item => {
      if (!latestPerSku[item.sku] || item.date > latestPerSku[item.sku].date) {
        latestPerSku[item.sku] = item;
      }
    });
    return Object.values(latestPerSku);
  }, [allSkuData, startDate, endDate]);

  const criticalAlerts = useMemo(() => {
     return filteredSkuData.map(sku => {
        if (!sku.competitors) return null;
        const severeThreats = sku.competitors.filter(c => sku.sellingPrice - c.currentPrice > 0);
        if (severeThreats.length > 0) {
           return { sku: sku.sku, skuName: sku.skuName, threats: severeThreats };
        }
        return null;
     }).filter(Boolean) as { sku: string; skuName: string; threats: any[] }[];
  }, [filteredSkuData]);

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

      {criticalAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-4 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
           <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 border border-rose-200 z-10">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
           </div>
           <div className="z-10 flex-1">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">防御雷达报警：发现核心竞品低价威胁 <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono animate-pulse">{criticalAlerts.length} SKU</span></h3>
              <p className="text-xs text-rose-700/80 mt-1 leading-relaxed">
                 存在核心竞品售价低于我方，建议立即关注对应 SKU 的自然转化率波动，并利用 AiBrain 进行推演，或启动降价 / 增加防御性广告预算。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                 {criticalAlerts.slice(0, 5).map(a => (
                    <div key={a.sku} className="bg-white/60 border border-rose-100 rounded px-2 py-1 text-[10px] font-bold text-rose-700">
                       {a.sku} <span className="text-rose-500 font-normal">[{a.threats.length}个威胁]</span>
                    </div>
                 ))}
                 {criticalAlerts.length > 5 && <div className="text-[10px] text-rose-500 font-bold flex items-end">... 等 {criticalAlerts.length} 个 SKU</div>}
              </div>
           </div>
        </div>
      )}

      <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

      <div className="grid grid-cols-1 gap-6">
        {filteredSkuData.length > 0 ? filteredSkuData.map((sku) => (
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
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-50 border border-sky-100 rounded text-[10px] text-sky-600 font-medium">
                  <History className="w-3 h-3" />
                  数据日期: {sku.date}
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                  onClick={() => onEditSku(sku, 'competitors')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
                      <TableCell colSpan={6} className="text-center py-10">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-xs text-text-sub italic">暂无监控竞品，记录每日数据请点击右上方 "+" 号</div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-dashed gap-1.5 text-xs text-slate-500 hover:text-primary hover:border-primary transition-all"
                            onClick={() => onEditSku(sku, 'competitors')}
                          >
                            <Plus className="w-3.5 h-3.5" /> 开始录入首个竞品
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-12 text-slate-400 text-sm">所选日期范围内暂无 SKU 数据</div>
        )}
      </div>
    </div>
  );
}
