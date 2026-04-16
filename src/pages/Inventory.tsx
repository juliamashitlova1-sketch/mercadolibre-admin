import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { addDays, subDays, format } from 'date-fns';
import { SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD, SLOW_STOCK_THRESHOLD } from '../constants';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  skuData: SKUStats[];
}

export default function Inventory() {
  const { skuData } = useOutletContext<ContextType>();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">库存与供应链 (FULL)</h2>
        <p className="text-text-sub text-sm">监控 FULL 仓库存健康度与补货建议</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">总库存价值</div>
          <div className="stat-value">${skuData.length > 0 ? skuData.reduce((s,sku)=>s+(sku.stock*(sku.purchasePrice || 0)),0).toLocaleString() : '0'} <span className="text-xs font-normal text-text-sub">MXN</span></div>
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
  );
}
