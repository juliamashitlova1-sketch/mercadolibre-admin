import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package } from 'lucide-react';
import { SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import { useOutletContext } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { addDays, format } from 'date-fns';

interface ContextType {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
}

export default function Inventory() {
  const { skuData } = useOutletContext<ContextType>();

  const displaySkuData = skuData; // Always use the latest per-SKU data from store


  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">库存与供应链 (FULL)</h2>
        <p className="text-text-sub text-sm">监控 FULL 仓库存健康度与补货建议</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">总库存价值</div>
          <div className="stat-value">${displaySkuData.reduce((s,sku)=>s+(sku.stock*(sku.purchasePrice || 0)),0).toLocaleString()} <span className="text-xs font-normal text-text-sub">MXN</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">短期断货风险</div>
          <div className="stat-value text-rose-500">{displaySkuData.filter(sku => (sku.stock / (sku.avgSalesSinceListing || 0.1)) < 15).length}</div>
          <div className="text-[10px] text-slate-400 mt-1">现货周期 &lt; 15天</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">全店 SKU 总数</div>
          <div className="stat-value text-sky-500">{displaySkuData.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">实时活跃 SKU 监控中</div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">供应链全链路追踪</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>SKU (名称)</TableHead>
                <TableHead>采购单价</TableHead>
                <TableHead>Full仓现货</TableHead>
                <TableHead>在途/生产</TableHead>
                <TableHead>现货周转 (Days)</TableHead>
                <TableHead>日均销量</TableHead>
                <TableHead className="text-right">预计售罄</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {displaySkuData.length > 0 ? displaySkuData.map((sku) => {
                const avgSales = sku.avgSalesSinceListing || 0.1;
                const dohOnHand = Math.floor(sku.stock / avgSales);
                
                const sellOutDate = addDays(new Date(), dohOnHand);
                const isHighRisk = dohOnHand < 10;
                
                return (
                  <TableRow key={sku.sku} className={isHighRisk ? 'bg-rose-50/30' : ''}>
                    <TableCell className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                        {sku.imageUrl ? (
                          <img src={sku.imageUrl} alt="sku" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                             <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-slate-700">{sku.sku}</div>
                        <div className="text-[10px] text-text-sub truncate max-w-[120px]">{sku.skuName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">¥{Number(sku.purchasePrice || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">{sku.stock}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {sku.inTransitStock || 0} / {sku.inProductionStock || 0}
                    </TableCell>
                    <TableCell className={`text-xs font-bold ${isHighRisk ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {dohOnHand} 天
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">{avgSales.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-[10px] font-bold text-slate-800">{format(sellOutDate, 'yyyy-MM-dd')}</div>
                      <Badge variant="outline" className={`text-[9px] mt-1 ${isHighRisk ? 'border-rose-200 text-rose-600 bg-rose-50' : dohOnHand < STOCK_HEALTH_THRESHOLD ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50'}`}>
                        {isHighRisk ? '即将断货' : dohOnHand < STOCK_HEALTH_THRESHOLD ? '建议补货' : '库存充足'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">所选日期范围内暂无库存数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
